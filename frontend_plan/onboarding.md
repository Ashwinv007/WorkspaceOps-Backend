# Frontend Developer Onboarding - WorkspaceOps

Welcome to the **WorkspaceOps** team! This guide is designed to get you up and running with the backend API as quickly as possible.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Running the Backend Locally
To start the API server locally:

```bash
# Clone the repository (if you haven't already)
git clone <repository-url>

# Install dependencies
npm install

# Start the server in development mode
npm run dev
```

The server will start at `http://localhost:4000`.

### 3. API Documentation
We have comprehensive API documentation available in two formats:

1.  **Markdown Guide**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) (Best for reading and concepts)
2.  **Swagger UI**: [http://localhost:4000/api-docs](http://localhost:4000/api-docs) (Best for interactive testing)

---

## 🔑 Authentication

The API uses **JWT (JSON Web Token)** for authentication.

> [!IMPORTANT]
> All endpoints (except `/auth/signup` and `/auth/login`) are protected and require a Bearer token.

### How to Authenticate
1.  Call `POST /auth/login` with email and password.
2.  Receive `{ user, token }` in the response.
3.  Store the `token` (e.g., in localStorage or HttpOnly cookie).
4.  Send the token in the `Authorization` header for all subsequent requests:

```javascript
// Example using fetch
const response = await fetch('http://localhost:4000/workspaces', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`, // <--- Don't forget 'Bearer ' prefix
    'Content-Type': 'application/json'
  }
});
```

---

## 🛠 Core Workflows (How to "Hello World")

Here is the exact sequence of API calls to build a basic flow in your frontend app.

### Step 1: User Signup
Create a new user to get started.
- **Endpoint**: `POST /auth/signup`
- **Body**: `{ "email": "dev@test.com", "password": "password123", "name": "Frontend Dev" }`
- **Result**: You get a `token`. **Save this!**

### Step 2: Create a Workspace
A user effectively "lives" inside a workspace. You are the OWNER of any workspace you create.
- **Endpoint**: `POST /workspaces`
- **Body**: `{ "tenantId": "my-tenant", "name": "My Dev Workspace" }`
- **Result**: You get a workspace object with an `id` (e.g., `ws_123`). **You will need this `workspaceId` for almost every other URL.**

### Step 3: Create an Entity
Entities are the "who" in the system (Customers, Employees, Vendors).
- **Endpoint**: `POST /workspaces/ws_123/entities`
- **Body**: `{ "name": "Acme Corp", "role": "CUSTOMER" }`
- **Result**: You get an `id` (e.g., `ent_456`).

### Step 4: Create a Document Type
Before uploading documents, you need to define *what kind* of document it is.
- **Endpoint**: `POST /workspaces/ws_123/document-types`
- **Body**:
  ```json
  {
    "name": "Invoice",
    "hasMetadata": true,
    "fields": [
      { "fieldKey": "invoice_number", "fieldType": "text", "isRequired": true }
    ]
  }
  ```
- **Result**: You get an `id` (e.g., `dt_789`).

### Step 5: Upload a Document
Now you can upload a file linked to that entity and document type.
- **Endpoint**: `POST /workspaces/ws_123/documents`
- **Format**: `multipart/form-data`
- **Fields**:
    - `file`: (your file blob)
    - `documentTypeId`: `dt_789`
    - `entityId`: `ent_456`
    - `metadata`: `{"invoice_number": "INV-2024-001"}` (as a stringified JSON)

---

## 🧩 Key Data Models

### Roles
- **Workspace Roles**: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
    - *UI Hint*: Owners and Admins should see "Settings" and "User Management" screens. Members just see content.
- **Entity Roles**: `SELF` (Your company), `CUSTOMER`, `EMPLOYEE`, `VENDOR`

### Statuses
- **Document Status**: `VALID`, `EXPIRING` (warn user), `EXPIRED` (block usage)
- **Work Item Status**: `DRAFT` -> `ACTIVE` -> `COMPLETED`
    - *UI Hint*: You cannot jump from Draft to Completed directly.

---

## 💡 Frontend Tips
1.  **Error Handling**: The API returns standard HTTP codes.
    - `400`: Check your payload validation.
    - `401`: Redirect to Login.
    - `403`: Show "Access Denied" toast.
2.  **Dates**: All dates are returned in ISO 8601 format (`2024-03-15T10:00:00Z`). Use a library like `date-fns` or `dayjs` to format them.
3.  **File Downloads**: The `/documents/:id/download` endpoint returns a file stream. You'll need to handle the binary response to trigger a browser download (e.g., creating a temporary `<a>` tag with `URL.createObjectURL`).

Happy Coding! 🚀
