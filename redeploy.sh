#!/bin/bash
#
# Fast redeploy for CODE-ONLY changes (no infra / terraform changes).
#
#   Backend  -> repackages app + deps, calls `aws lambda update-function-code`
#               (skips `terraform apply`, much faster than deploy.sh).
#   Frontend -> rebuilds React, `aws s3 sync`, invalidates CloudFront.
#
# Requires existing infra (run ./deploy.sh once first so Terraform state exists).
#
# Usage:
#   ./redeploy.sh backend
#   ./redeploy.sh frontend
#   ./redeploy.sh both
#   ./redeploy.sh             # interactive menu

set -euo pipefail

# --- Colours ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$REPO_ROOT/terraform"
BE_DIR="$REPO_ROOT/backend"
FE_DIR="$REPO_ROOT/frontend"

check_cli() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ '$1' not found in PATH.${NC}" >&2
    exit 1
  fi
}

tf_output() {
  # Read a terraform output without leaving the user in terraform/ on error.
  (cd "$TF_DIR" && terraform output -raw "$1" 2>/dev/null) || {
    echo -e "${RED}❌ Failed to read terraform output '$1'. Has infra been deployed yet (./deploy.sh)?${NC}" >&2
    exit 1
  }
}

# --- Ensure AWS region is set ---
# Priority: existing env -> AWS_PROFILE config -> terraform.tfvars -> default us-east-1
ensure_aws_region() {
  if [ -n "${AWS_REGION:-}" ] || [ -n "${AWS_DEFAULT_REGION:-}" ]; then
    return
  fi
  # Try aws CLI config (silent — empty if unset)
  local cfg_region
  cfg_region=$(aws configure get region 2>/dev/null || true)
  if [ -n "$cfg_region" ]; then
    export AWS_REGION="$cfg_region"
    return
  fi
  # Try terraform.tfvars (aws-region = "us-east-1")
  local tfv_region
  tfv_region=$(grep -E '^\s*aws-region\s*=' "$TF_DIR/terraform.tfvars" 2>/dev/null \
    | sed -E 's/.*=\s*"([^"]+)".*/\1/' | head -n1)
  if [ -n "$tfv_region" ]; then
    export AWS_REGION="$tfv_region"
    export AWS_DEFAULT_REGION="$tfv_region"
    echo -e "${CYAN}🌎 Using AWS region from terraform.tfvars: ${YELLOW}$AWS_REGION${NC}"
    return
  fi
  export AWS_REGION="us-east-1"
  export AWS_DEFAULT_REGION="us-east-1"
  echo -e "${YELLOW}⚠️  No AWS region configured. Falling back to ${AWS_REGION}.${NC}"
}

ensure_aws_region

redeploy_backend() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}   📦 Backend code-only redeploy (Lambda update-function-code)${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  check_cli python3
  check_cli zip
  check_cli aws

  local fn_name
  fn_name=$(tf_output 'lambda_function-name')
  echo -e "${CYAN}🎯 Lambda function: ${YELLOW}$fn_name${NC}"

  cd "$BE_DIR"

  echo -e "${CYAN}🧹 Cleaning previous build...${NC}"
  rm -rf build_lambda

  echo -e "${CYAN}📥 Installing Linux x86_64 / py3.11 wheels...${NC}"
  python3 -m pip install \
    --platform manylinux2014_x86_64 \
    --target build_lambda \
    --only-binary=:all: \
    --implementation cp \
    --python-version 3.11 \
    -r requirements-lambda.txt \
    --quiet

  echo -e "${CYAN}📂 Copying app/ into bundle...${NC}"
  cp -r app build_lambda/
  find build_lambda -type d -name "__pycache__" -exec rm -rf {} +

  echo -e "${CYAN}🤐 Zipping bundle -> terraform/backend.zip ...${NC}"
  (cd build_lambda && zip -qr "$TF_DIR/backend.zip" .)

  echo -e "${CYAN}☁️  Uploading to Lambda...${NC}"
  aws lambda update-function-code \
    --function-name "$fn_name" \
    --zip-file "fileb://$TF_DIR/backend.zip" \
    --publish \
    --no-cli-pager \
    --output table \
    --query '{Function:FunctionName,Version:Version,Size:CodeSize,LastUpdate:LastModified}'

  echo -e "${CYAN}⏳ Waiting for Lambda to finish updating...${NC}"
  aws lambda wait function-updated --function-name "$fn_name"

  local api_url
  api_url=$(tf_output api_url)
  echo -e "${GREEN}✅ Backend redeployed.${NC}"
  echo -e "${CYAN}🔗 API: ${YELLOW}$api_url${NC}"
}

redeploy_frontend() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}   🎨 Frontend code-only redeploy (build + S3 + CloudFront)${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  check_cli npm
  check_cli aws

  local api_url s3_bucket cf_id fe_url
  api_url=$(tf_output api_url)
  s3_bucket=$(tf_output s3_bucket)
  cf_id=$(tf_output cloudfront_distribution_id)
  fe_url=$(tf_output cloudfront_url)

  echo -e "${CYAN}🌐 API:        ${YELLOW}$api_url${NC}"
  echo -e "${CYAN}🪣 S3 bucket:  ${YELLOW}$s3_bucket${NC}"
  echo -e "${CYAN}📡 CloudFront: ${YELLOW}$cf_id${NC}"

  echo -e "${CYAN}📝 Writing frontend/.env.production...${NC}"
  echo "VITE_API_URL=$api_url" > "$FE_DIR/.env.production"

  cd "$FE_DIR"
  # Skip `npm install` on hot path — assume node_modules is already there.
  # Run it manually after pulling dep changes.
  if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚠️  node_modules missing — running npm install...${NC}"
    npm install
  fi

  echo -e "${CYAN}🏗️  Building production bundle...${NC}"
  npm run build

  echo -e "${CYAN}☁️  Syncing dist/ -> s3://$s3_bucket ...${NC}"
  aws s3 sync dist/ "s3://$s3_bucket" --delete

  echo -e "${CYAN}🧹 Invalidating CloudFront cache (/*) ...${NC}"
  aws cloudfront create-invalidation \
    --distribution-id "$cf_id" \
    --paths "/*" \
    --no-cli-pager \
    --output table \
    --query 'Invalidation.{Id:Id,Status:Status,Created:CreateTime}'

  echo -e "${GREEN}✅ Frontend redeployed.${NC}"
  echo -e "${CYAN}🔗 App: ${YELLOW}$fe_url${NC}"
}

usage() {
  cat <<EOF
Usage: $0 [backend|frontend|both]

  backend   Redeploy only backend code (Lambda update-function-code)
  frontend  Redeploy only frontend code (S3 sync + CloudFront invalidate)
  both      Backend first, then frontend
  (no arg)  Interactive menu
EOF
}

target="${1:-}"

if [ -z "$target" ]; then
  echo -e "${YELLOW}Pick a redeploy target:${NC}"
  echo "  1) Backend only"
  echo "  2) Frontend only"
  echo "  3) Both"
  echo "  4) Exit"
  read -r -p "Selection [1-4]: " sel
  case "$sel" in
    1) target=backend ;;
    2) target=frontend ;;
    3) target=both ;;
    4) exit 0 ;;
    *) echo -e "${RED}Invalid selection.${NC}"; exit 1 ;;
  esac
fi

case "$target" in
  backend)  redeploy_backend ;;
  frontend) redeploy_frontend ;;
  both)     redeploy_backend; redeploy_frontend ;;
  -h|--help|help) usage ;;
  *) echo -e "${RED}Unknown target: $target${NC}"; usage; exit 1 ;;
esac

echo -e "\n${GREEN}🎉 Done.${NC}"
