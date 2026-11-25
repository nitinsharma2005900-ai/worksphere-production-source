# WorkSphere – Multi-Tenant Project Management & Workflow Automation Platform

[![CI Pipeline](https://github.com/worksphere/worksphere/actions/workflows/ci.yml/badge.svg)](https://github.com/worksphere/worksphere/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-34%20Passed-success)](docs/TESTING_GUIDE.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Deployment-Demo%20preview-yellow)](docs/KNOWN_LIMITATIONS.md)

**WorkSphere** is a learning-project SaaS demo featuring tenant-scoped API checks, real-time interactive task boards, optimistic concurrency control (HTTP 409 for stale task updates), Python FastAPI workload analytics, and a BullMQ-compatible job queue.

> **Deployment status:** the current Render configuration deploys a functional demo. The Node API uses an in-memory runtime store, so application data and queue idempotency records are lost after a restart. It must not be presented as a durable production deployment until the route repositories are migrated to PostgreSQL. See [Known Limitations](docs/KNOWN_LIMITATIONS.md) and [Deployment Guide](docs/DEPLOYMENT_GUIDE.md).

---

## Public Repository

Anyone can view and clone the project source without a GitHub repository invitation:

```bash
git clone https://github.com/nitinsharma2005900-ai/worksphere-production-source.git
```

[Download the 10-page project documentation](docs/WorkSphere_Project_Documentation.pdf).

## 🌟 Key Platform Highlights
- **Multi-Tenant Isolation**: Tenant A (Acme Corp) can never access Tenant B's (Globex Industries) records. Enforced at JWT, middleware, and database layers.
- **5 Granular Roles**: Platform Admin, Organization Owner, Project Manager, Team Member, and Auditor (Strictly read-only).
- **Concurrency Protection**: Optimistic locking on task entities via an incrementing `version` column prevents silent race-condition overwrites.
- **FastAPI Analytics Microservice**: Independent Python microservice with chunked streaming processors maintaining `<3 MB` peak memory over 25,000+ records.
- **Job Deduplication & Idempotency**: Redis/BullMQ background queue with idempotency keys preventing duplicate notifications on worker retries.
- **18 Production SaaS Pages**: Next.js 14 App Router, Tailwind CSS, TanStack Query, and Recharts.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Python**: v3.11+ or v3.13+
- **npm**: v10+

### 2. Environment Configuration
```bash
cp .env.example .env
```

### 3. Installation
```bash
# Backend setup
cd backend && npm install && npx prisma generate && cd ..

# Python Analytics setup
cd analytics-service && pip install -r requirements.txt && cd ..

# Frontend setup
cd frontend && npm install && cd ..
```

### 4. Running the Complete System
You can start all services concurrently from the root or in 3 separate terminals:

```bash
# Terminal 1: Node.js Express API (Port 4000)
cd backend && npm run dev

# Terminal 2: Python FastAPI Analytics (Port 8000)
cd analytics-service && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Next.js Frontend (Port 3000)
cd frontend && npm run dev
```

---

## 🌐 Local Application Endpoints

| Service | Local URL | Description |
|---|---|---|
| **Frontend Application** | [http://localhost:3000](http://localhost:3000) | Next.js SaaS Web App |
| **Node.js Backend API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Core REST API |
| **Node.js Swagger Docs** | [http://localhost:4000/api-docs](http://localhost:4000/api-docs) | Interactive OpenAPI 3.0 UI |
| **Python Analytics Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | FastAPI Interactive Swagger UI |
| **Socket.IO Engine** | `ws://localhost:4000` | Real-time WebSocket connection |

---

## 👥 Pre-Seeded Evaluator Logins

All accounts share the password: `Password123!`

### Organization 1: Acme Corporation (Enterprise)
| Role | Email | Password | Features to Test |
|---|---|---|---|
| **Platform Admin** | `admin@worksphere.io` | `Password123!` | Cross-tenant directory, platform admin console |
| **Org Owner** | `owner@acme.com` | `Password123!` | Team management, employee invitations, workflows |
| **Project Manager**| `pm@acme.com` | `Password123!` | Projects, milestones, task assignments |
| **Team Member** | `dev@acme.com` | `Password123!` | Task updates, comments, subtasks checklist |
| **Auditor** | `auditor@acme.com` | `Password123!` | Read-only compliance logs (Write operations blocked with 403) |

### Organization 2: Globex Industries (Pro)
| Role | Email | Password | Features to Test |
|---|---|---|---|
| **Globex Owner** | `owner@globex.com` | `Password123!` | Proves Tenant A cannot access Tenant B records |

*Tip: The Login page features quick 1-click login buttons for every role.*

---

## 🧪 Automated Test Execution

### 1. Run Node.js Backend Tests (22 Tests)
```bash
cd backend
npm test
```
*Covers Concurrency Capstone (HTTP 409), Tenant Isolation (HTTP 403/404), RBAC, and Projects/Tasks CRUD.*

### 2. Run Python Analytics Tests (12 Tests)
```bash
cd analytics-service
pytest -v
```
*Covers health endpoints, auth validation, workload analysis, cycle-time calculations, and streaming generators.*

### 3. Run Python Memory & Streaming Benchmark
```bash
cd analytics-service
python processors/benchmark.py
```
*Processes 25,000 synthetic task records in `<0.2s` with `<3 MB` peak RAM consumption.*

---

## 🐳 Docker Cluster Execution

To launch all 7 services (Frontend, Backend, Analytics, PostgreSQL, Redis, MinIO, BullMQ Worker) in isolated containers:
```bash
docker compose up -d --build
```
Verify status:
```bash
docker compose ps
```

---

## 📑 Complete Documentation Directory
- [Assessment Tracker](docs/ASSESSMENT_TRACKER.md) – Verification matrix of all 15 mandatory assessments.
- [Project Overview](docs/PROJECT_OVERVIEW.md) – Business scope and tenancy model.
- [System Architecture](docs/ARCHITECTURE.md) – Mermaid component topology and sequence diagrams.
- [Database Design](docs/DATABASE_DESIGN.md) – Relational ER diagram and optimistic locking design.
- [API Documentation](docs/API_DOCUMENTATION.md) – Versioned REST endpoints and error codes.
- [Authentication & Security](docs/AUTHENTICATION_AND_SECURITY.md) – JWT rotation and RBAC matrix.
- [Testing Guide](docs/TESTING_GUIDE.md) – Test commands, coverage, and execution report.
- [Incident Response Runbook](docs/INCIDENT_RESPONSE.md) – 6 documented failure and recovery drills.
- [Docker Guide](docs/DOCKER_GUIDE.md) – Multi-stage builds and compose configurations.
- [Production Deployment](docs/DEPLOYMENT_GUIDE.md) – Cloud VM, Nginx TLS, and automated backups.
- [API Keys Setup](docs/API_KEYS_SETUP.md) – Environment variables reference.
- [Known Limitations](docs/KNOWN_LIMITATIONS.md) – Architectural tradeoffs and roadmap.

---

## ⚖️ License
MIT License. Developed for technical skills evaluation cohort.
