#!/bin/bash

# --- Coloured Terminal Outputs ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Print Header ---
echo -e "${CYAN}"
echo "========================================================="
echo "   🚀 EMS (Employee Management System) AWS Deployer 🚀   "
echo "========================================================="
echo -e "${NC}"

# --- Dependency Checklist ---
check_cli() {
  local cmd=$1
  if ! command -v "$cmd" &> /dev/null; then
    echo -e "${RED}❌ Error: '$cmd' command not found. Please install it and ensure it's in your PATH.${NC}"
    exit 1
  fi
}

deploy_backend() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}       📦 1. Packaging Backend for AWS Lambda            ${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  # Navigate to backend
  cd backend

  # Clean up previous build directory if it exists
  echo -e "${CYAN}🧹 Cleaning previous build artifacts...${NC}"
  rm -rf build_lambda
  
  # Download and install Linux x86_64, Python 3.11 compatible dependencies
  echo -e "${CYAN}📥 Fetching Linux x86_64, Python 3.11 compatible dependencies...${NC}"
  if ! python3 -m pip install \
    --platform manylinux2014_x86_64 \
    --target build_lambda \
    --only-binary=:all: \
    --implementation cp \
    --python-version 3.11 \
    -r requirements-lambda.txt; then
    echo -e "${RED}❌ Failed to install platform-compatible dependencies. Ensure pip and python3 are updated.${NC}"
    exit 1
  fi

  # Copy the app source code
  echo -e "${CYAN}📂 Copying application source code...${NC}"
  cp -r app build_lambda/

  # Clean local __pycache__ directories
  echo -e "${CYAN}🧹 Cleaning __pycache__ directories...${NC}"
  find build_lambda -type d -name "__pycache__" -exec rm -rf {} +

  # Zip the contents directly into the terraform directory
  echo -e "${CYAN}🤐 Compressing package into backend.zip...${NC}"
  cd build_lambda
  if ! zip -q -r ../../terraform/backend.zip .; then
    echo -e "${RED}❌ Failed to create backend.zip.${NC}"
    exit 1
  fi
  cd ../..

  echo -e "${GREEN}✅ Backend packaged successfully! (backend.zip created in terraform/)${NC}"

  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}       🏗️ 2. Applying Infrastructure Updates (Terraform)  ${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  cd terraform
  
  echo -e "${CYAN}⚙️ Initializing Terraform...${NC}"
  terraform init

  echo -e "${CYAN}🚀 Applying Terraform changes...${NC}"
  if ! terraform apply -auto-approve; then
    echo -e "${RED}❌ Terraform deployment failed!${NC}"
    exit 1
  fi

  cd ..
  echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

deploy_frontend() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}       🎨 3. Building React Frontend Production Bundle   ${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  cd terraform
  echo -e "${CYAN}🔍 Retrieving deployment outputs from Terraform...${NC}"
  
  # Fetch necessary terraform outputs
  API_URL=$(terraform output -raw api_url)
  S3_BUCKET=$(terraform output -raw s3_bucket)
  CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
  FRONTEND_URL=$(terraform output -raw cloudfront_url)

  if [ -z "$API_URL" ] || [ -z "$S3_BUCKET" ] || [ -z "$CLOUDFRONT_ID" ]; then
    echo -e "${RED}❌ Failed to fetch required Terraform outputs. Ensure you have deployed the backend/infra first!${NC}"
    exit 1
  fi

  cd ..

  echo -e "${CYAN}🌐 Target API Gateway: ${YELLOW}$API_URL${NC}"
  echo -e "${CYAN}🪣 Target S3 Bucket:    ${YELLOW}$S3_BUCKET${NC}"
  echo -e "${CYAN}📡 CloudFront ID:     ${YELLOW}$CLOUDFRONT_ID${NC}"

  # Write env variables to frontend/.env.production
  echo -e "${CYAN}📝 Generating frontend/.env.production...${NC}"
  echo "VITE_API_URL=$API_URL" > frontend/.env.production

  # Build the production bundle
  cd frontend
  echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
  npm install
  
  echo -e "${CYAN}🏗️ Compiling React Single Page Application...${NC}"
  if ! npm run build; then
    echo -e "${RED}❌ Frontend build compilation failed!${NC}"
    exit 1
  fi

  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}       📤 4. Syncing Frontend to AWS S3 & CloudFront CDN ${NC}"
  echo -e "${BLUE}=========================================================${NC}"

  # Sync assets to S3
  echo -e "${CYAN}☁️ Syncing build folder to S3 bucket (s3://$S3_BUCKET)...${NC}"
  if ! aws s3 sync dist/ s3://"$S3_BUCKET" --delete; then
    echo -e "${RED}❌ S3 bucket sync failed! Make sure your AWS credentials are configured properly.${NC}"
    exit 1
  fi

  # Invalidate CloudFront CDN cache
  echo -e "${CYAN}🧹 Invalidating CloudFront cache to apply changes instantly...${NC}"
  if ! aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*" > /dev/null; then
    echo -e "${YELLOW}⚠️ CloudFront invalidation warning. You might need to wait for normal TTL expiry, or check AWS permissions.${NC}"
  else
    echo -e "${GREEN}✅ CloudFront invalidation triggered successfully!${NC}"
  fi

  cd ..

  echo -e "\n${GREEN}========================================================="
  echo -e "   🎉 FRONTEND DEPLOYED SUCCESSFULLY! 🎉"
  echo -e "   🔗 Access application at: ${YELLOW}$FRONTEND_URL${NC}"
  echo -e "=========================================================${NC}"
}

# --- Check required tools ---
check_cli "zip"
check_cli "npm"
check_cli "python3"
check_cli "terraform"
check_cli "aws"

# --- User menu selection ---
echo -e "${YELLOW}Please select a deployment option:${NC}"
echo "  1) Deploy Backend only (Packages Lambda zip & applies Terraform infrastructure)"
echo "  2) Deploy Frontend only (Retrieves TF outputs, builds React app, syncs S3, invalidates CDN)"
echo "  3) Deploy Both (Full-Stack deployment: Backend first, then Frontend)"
echo "  4) Exit"
echo

read -p "Enter selection [1-4]: " selection

case $selection in
  1)
    deploy_backend
    ;;
  2)
    deploy_frontend
    ;;
  3)
    deploy_backend
    deploy_frontend
    ;;
  4)
    echo -e "\n${GREEN}Deployment cancelled. Exiting.${NC}"
    exit 0
    ;;
  *)
    echo -e "\n${RED}❌ Invalid selection. Please choose an option between 1 and 4.${NC}"
    exit 1
    ;;
esac
