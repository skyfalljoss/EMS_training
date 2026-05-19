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
