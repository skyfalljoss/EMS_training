# EMS (Employee Management System)

A full-stack web application for managing employees, departments, and administrative users.

## 🏗 System Architecture

The application is built on a modern decoupled architecture separating the client-side single-page application from the backend RESTful API.

### Frontend

- **Framework**: React 18 powered by Vite.
- **Language**: TypeScript (`^6.x`).
- **Routing**: Client-side routing via React Router DOM.
- **State & Data Fetching**: `@tanstack/react-query` to manage remote state, query caching, and loading/error states.
- **Design Pattern**:
  - `src/api`: Axios wrappers for core HTTP endpoints.
  - `src/services`: Abstracts data fetching mechanisms away from React components. Handles data transformation into `View` models.
  - `src/hooks`: Custom React hooks (e.g. `useEmployeesList`) that wrap React Query `useQuery` calls, making data consumptions across components trivial.
  - `src/pages` & `src/components`: UI presentation layers using generic components like glass-style cards and specific layouts (e.g. `TopBar`, `Sidebar`).

### Backend

- **Framework**: FastAPI (Python 3.11+).
- **Database**: MongoDB via Motor (async MongoDB driver).
- **Validation**: Pydantic for rigid schema enforcement and payload validation.
- **Authentication**: JWT-based stateless authentication with `bcrypt` for secure password hashing.
- **Design Pattern**:
  - **API Routes** (`/api/routes`): Standard FastAPI dependency injection. Handles HTTP mapping and schema validation.
  - **Controllers** (`/controllers`): Encapsulates core business logic and authorization.
  - **Repositories** (`/repositories`): Data Access Layer executing direct CRUD operations to MongoDB.
  - **Dependencies Layer** (`/dependencies`): Provides shared utilities like database connections, JWT parsing (`get_current_user`), and Role-Based Access Guards (RBAC).

---

## 🔄 Application Flow

1. **Authentication Flow**
   - The user inputs credentials onto the React Login page.
   - Frontend calls `POST /auth/login`.
   - FastAPI parses the request, the AuthController verifies the hashed password using bcrypt, and signs a JWT.
   - The React frontend receives the token, decodes the claims (like role/user_id), and saves the token to local storage.

2. **Protected Route Access**
   - Upon navigating to a protected route (e.g., `/employees`), the frontend mounts the page and triggers its React Query hooks.
   - The custom hooks (e.g. `useEmployeesList`) execute the Service fetch. The Axios interceptor injects the stored JWT as an `Authorization: Bearer <token>` header.
   - FastAPI intercepts the request. The Dependency layer (`require_permissions` / `get_current_user`) verifies the JWT expiry and valid signatures before proceeding to the route.

3. **Data Request Process**
   - **Route**: Validates incoming parameters (e.g., filters via Pydantic).
   - **Controller**: Triggers the business logic (like ensuring a department change is valid).
   - **Repository**: Executes an Async Motor database query to MongoDB, returning standard Document dictionaries.
   - **Controller -> Route**: Serializes the dictionary back into a secure Pydantic response model (stripping hidden fields).
   - **Frontend**: The Service receives the JSON, formats the payload for the UI (e.g. transforming `department_id` to standard view data), and populates React Query's cache. The component renders the data.

---

## 🛠 Useful Commands

### Cleaning up Python Caches

```bash
find . -name "__pycache__" -type d -exec rm -rf {} +
```

### Running the Application Local

**Backend**:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 AWS Deployment & Redeployment

There are **two automation scripts** at the repo root. Use the right one for the right job:

| Script | Use it when… | Speed | What runs |
|---|---|---|---|
| [`deploy.sh`](deploy.sh) | Infra changes, env-var changes, first-time deploy, disaster recovery | Slow (~minutes) | Packages Lambda zip → `terraform apply` → frontend build → S3 sync → CloudFront invalidate |
| [`redeploy.sh`](redeploy.sh) | **Code-only** changes to backend or frontend (no `.tf` edits) | Fast (~30–60s) | Packages Lambda zip → `aws lambda update-function-code` → frontend build → S3 sync → CloudFront invalidate |

> [!IMPORTANT]
> AWS Lambda runs on **Linux x86_64 / Python 3.11**. Both scripts use `pip install --platform manylinux2014_x86_64 --python-version 3.11` so the bundle is compatible even when you build from macOS / arm64.

---

### Prerequisites (one-time)

```bash
# CLIs required (both scripts call check_cli on these)
brew install awscli terraform node python@3.11 zip

# AWS credentials + region
aws configure                # access key, secret, region (us-east-1), output (json)

# Frontend deps (only needed for the first build)
cd frontend && npm install && cd ..
```

The scripts read the AWS region from `$AWS_REGION` → `aws configure get region` → [`terraform/terraform.tfvars`](terraform/terraform.tfvars) (`aws-region`) → fallback `us-east-1`.

---

### Script 1 — `deploy.sh` (full deploy with Terraform)

**When to use:** first deploy, any `.tf` change, IAM/env-var/API Gateway/Lambda config change, you want Terraform to verify and reconcile the whole stack.

Run from the **repo root**:

```bash
./deploy.sh
```

You'll see an interactive menu:

```
Please select a deployment option:
  1) Deploy Backend only   – package Lambda zip & run `terraform apply`
  2) Deploy Frontend only  – read TF outputs, build React, sync S3, invalidate CDN
  3) Deploy Both           – backend first, then frontend
  4) Exit
```

What each option does internally:

1. **Backend** (`deploy_backend`)
   - `rm -rf backend/build_lambda`
   - `pip install … -r backend/requirements-lambda.txt` into `build_lambda/`
   - Copy `backend/app/` into the bundle, strip `__pycache__`
   - Zip to `terraform/backend.zip`
   - `cd terraform && terraform init && terraform apply -auto-approve`
   - Terraform's `source_code_hash` detects the new zip and updates the Lambda function.

2. **Frontend** (`deploy_frontend`)
   - Reads `api_url`, `s3_bucket`, `cloudfront_distribution_id`, `cloudfront_url` via `terraform output -raw …`
   - Writes `frontend/.env.production` with `VITE_API_URL=<api_url>`
   - `cd frontend && npm install && npm run build`
   - `aws s3 sync dist/ s3://<bucket> --delete`
   - `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`

3. **Both** — runs (1) then (2). Always do this if a frontend change depends on a new backend endpoint.

> [!NOTE]
> Terraform `source_code_hash` ensures only the Lambda's code resource is recreated when nothing else in `.tf` changed — but Terraform still re-plans the whole graph, so it's slower than `redeploy.sh`.

---

### Script 2 — `redeploy.sh` (fast code-only redeploy)

**When to use:** you only changed Python files under `backend/app/` and/or files under `frontend/src/`. No `.tf` edits, no new environment variables, no IAM changes.

Run from the **repo root** with an argument or use the interactive menu:

```bash
./redeploy.sh backend     # backend code only
./redeploy.sh frontend    # frontend code only
./redeploy.sh both        # backend, then frontend
./redeploy.sh             # interactive prompt
./redeploy.sh --help      # usage
```

How it differs from `deploy.sh`:

| Step | `deploy.sh` | `redeploy.sh` |
|---|---|---|
| Backend upload | `terraform apply -auto-approve` (re-plans entire stack) | `aws lambda update-function-code --publish` (direct, ~10s) |
| Waits for Lambda ready | ❌ | ✅ `aws lambda wait function-updated` |
| `npm install` on frontend | always runs | only if `node_modules/` is missing |
| Region resolution | relies on `aws configure` | falls back to `terraform.tfvars` automatically |
| Reads infra config | from Terraform plan | from `terraform output` (state must already exist) |
| CloudFront invalidation | ✅ | ✅ |

**Backend-only flow** (`redeploy_backend`):
1. Reads Lambda function name from `terraform output -raw lambda_function-name`.
2. Rebuilds `terraform/backend.zip` with the same platform-compatible pip install as `deploy.sh`.
3. `aws lambda update-function-code --function-name <name> --zip-file fileb://terraform/backend.zip --publish`
4. `aws lambda wait function-updated --function-name <name>`
5. Prints the API URL for a quick smoke test.

**Frontend-only flow** (`redeploy_frontend`):
1. Reads `api_url`, `s3_bucket`, `cloudfront_distribution_id`, `cloudfront_url` from Terraform outputs.
2. Writes `frontend/.env.production`.
3. `npm run build` (skips `npm install` unless `node_modules/` is missing).
4. `aws s3 sync dist/ s3://<bucket> --delete`
5. `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`

---

### Pre-flight checks (do this before every deploy)

```bash
# Backend
cd backend && make tests             # all 110 tests must pass
.venv/bin/python -c "from app.main import app; print('OK')"

# Frontend
cd ../frontend
npm run typecheck                    # no TS errors
npm run lint                         # no lint errors
npm run build                        # production bundle compiles cleanly
```

If any of these fail, **do not deploy** — fix locally first.

---

### After deploy — verify in production

```bash
cd terraform
API_URL=$(terraform output -raw api_url)
FE_URL=$(terraform output -raw cloudfront_url)

curl -s "$API_URL/health" | jq .     # backend liveness
open "$FE_URL"                       # frontend in browser (hard-refresh once)
```

CloudFront invalidation typically completes in 30–60 seconds. If the browser shows stale assets, hard-refresh (Cmd-Shift-R) or wait one more minute.

---

### Common pitfalls

- **`ModuleNotFoundError` in Lambda after deploy.** You added a new runtime dependency but forgot to add it to [`backend/requirements-lambda.txt`](backend/requirements-lambda.txt). Dev-only packages (`pytest`, `httpx`, `mongomock-motor`, `uvicorn`) must NOT live there — Lambda uses Mangum, not uvicorn.
- **`NoRegion` error from AWS CLI.** Run `aws configure set region us-east-1`, or set `export AWS_REGION=us-east-1`. `redeploy.sh` auto-resolves from `terraform.tfvars`, but bare `aws` calls won't.
- **Frontend hitting wrong API.** `frontend/.env.production` is overwritten on every deploy from `terraform output api_url`. Don't hand-edit it; if you need extra vars, append them inside `deploy_frontend()` / `redeploy_frontend()`.
- **New npm dependency missing in production bundle.** `redeploy.sh` skips `npm install` if `node_modules/` already exists. After `npm install <pkg>`, either commit the new `package.json`/lockfile and let `deploy.sh` run `npm install`, or run `npm install` manually before `./redeploy.sh frontend`.
- **Infra change but used `redeploy.sh`.** `.tf` edits are ignored by `redeploy.sh` — it never calls `terraform apply`. Use `./deploy.sh` for any infra change.
- **`Failed to read terraform output …`.** `redeploy.sh` requires Terraform state to already exist. Run `./deploy.sh` once first to create the infrastructure.


