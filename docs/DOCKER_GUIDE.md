# WorkSphere – Docker & Containerization Guide

## 1. Container Architecture Overview
WorkSphere provides container definitions for all architectural layers:
- **`backend/Dockerfile`**: Multi-stage Node.js 22 Alpine build, non-root `appuser`, healthcheck on `/health`.
- **`analytics-service/Dockerfile`**: Multi-stage Python 3.13 Slim build, non-root `pythonuser`, healthcheck on `/health`.
- **`frontend/Dockerfile`**: Multi-stage Next.js 14 production bundle, non-root `nextjs`, healthcheck on `/`.
- **`infrastructure/docker/worker.Dockerfile`**: BullMQ asynchronous worker.
- **`docker-compose.yml`**: Unified local and staging orchestration across 7 services.

---

## 2. Docker Compose Commands

### Start All Services
```bash
docker compose up --build -d
```

### Inspect Container Health & Status
```bash
docker compose ps
```

### View Live Structured Logs
```bash
docker compose logs -f backend analytics-service
```

### Stop Cluster & Preserve Persistent Data
```bash
docker compose down
```

### Clean Teardown (Purge Volumes)
```bash
docker compose down -v
```

---

## 3. Container Port & URL Mapping

| Service | Container Name | Host Port | Internal Network Port | Description |
|---|---|---|---|---|
| **Frontend** | `worksphere-frontend` | `3000` | `3000` | Next.js App Router SaaS UI |
| **Backend API** | `worksphere-backend` | `4000` | `4000` | Node.js / Express REST API & WebSockets |
| **Swagger UI** | `worksphere-backend` | `4000/api-docs` | `4000` | Interactive OpenAPI 3.0 Documentation |
| **FastAPI Analytics** | `worksphere-analytics` | `8000` | `8000` | Python Analytics & Streaming Engine |
| **FastAPI Swagger** | `worksphere-analytics` | `8000/docs` | `8000` | FastAPI Interactive OpenAPI Documentation |
| **PostgreSQL** | `worksphere-postgres` | `5432` | `5432` | Relational Database (v16) |
| **Redis** | `worksphere-redis` | `6379` | `6379` | Cache & BullMQ Queue |
| **MinIO Storage** | `worksphere-minio` | `9000` / `9001` | `9000` / `9001` | S3-compatible Object Storage |
