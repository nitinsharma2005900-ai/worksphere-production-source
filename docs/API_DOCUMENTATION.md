# WorkSphere – API Reference & Endpoints Guide

## 1. Interactive Documentation Endpoints
- **Node.js Express Swagger UI**: `http://localhost:4000/api-docs`
- **Node.js Raw OpenAPI Specification**: `http://localhost:4000/api-docs.json`
- **FastAPI Interactive Swagger**: `http://localhost:8000/docs`
- **FastAPI ReDoc**: `http://localhost:8000/redoc`
- **Postman Collection**: `docs/api/WorkSphere.postman_collection.json`

---

## 2. Standard Response & Error Envelopes

### Success Response Format (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "requestId": "4c8f5f68-75b2-4d7a-8b1b-648b7f83e540"
}
```

### Error Response Format (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "STALE_OBJECT_STATE",
    "message": "Optimistic lock failure: Task was modified by another user. Server version is 2, client version was 1.",
    "details": {
      "taskId": "tsk-acme-001",
      "serverVersion": 2,
      "clientVersion": 1
    }
  },
  "requestId": "4c8f5f68-75b2-4d7a-8b1b-648b7f83e540"
}
```

---

## 3. Core REST API Endpoints Summary

| Method | Endpoint | Description | Role Authorization |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register user and initialize tenant organization | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user, issue access & refresh tokens | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and issue new access token | Public (Valid Refresh Token) |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token and invalidate session | Authenticated |
| `GET` | `/api/v1/auth/me` | Fetch active profile and organization memberships | Authenticated |
| `GET` | `/api/v1/organizations` | List permitted tenant organizations | Authenticated |
| `GET` | `/api/v1/projects` | List projects belonging to active tenant | Authenticated |
| `POST` | `/api/v1/projects` | Create a new project with key | Owner, PM, Admin |
| `GET` | `/api/v1/tasks` | List tasks (filtered by `projectId`, `status`, etc.) | Authenticated |
| `POST` | `/api/v1/tasks` | Create new task (initial version = 1) | Authenticated (No Auditor) |
| `PATCH` | `/api/v1/tasks/:id` | **Optimistic locking update** (requires `version`) | Authenticated (No Auditor) |
| `GET` | `/api/v1/tasks/:id` | Get task details, subtasks, and comments | Authenticated |
| `POST` | `/api/v1/subtasks` | Add subtask checklist item | Authenticated (No Auditor) |
| `POST` | `/api/v1/tasks/:id/comments` | Post comment and emit real-time event | Authenticated (No Auditor) |
| `POST` | `/api/v1/attachments/upload`| Upload file attachment (up to 20MB) | Authenticated (No Auditor) |
| `GET` | `/api/v1/analytics/project-health/:id`| Real-time project health calculation | Authenticated |
| `GET` | `/api/v1/analytics/workload`| Team capacity and utilization metrics | Authenticated |
| `GET` | `/api/v1/audit` | Query immutable audit events | Auditor, Owner, Admin |
