# WorkSphere – Local Setup & Developer Guide

## 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Python**: v3.11+ or v3.13+
- **npm**: v10+
- **Git**
- *(Optional)* Docker & Docker Compose for containerized execution

---

## 2. Quick Local Start (Native Runtimes)

### Step 1: Clone & Configure Environment
```bash
git clone <repository_url>
cd worksphere
cp .env.example .env
```

### Step 2: Install Dependencies
```bash
# In backend
cd backend
npm install
npx prisma generate
cd ..

# In analytics service
cd analytics-service
pip install -r requirements.txt
cd ..

# In frontend
cd frontend
npm install
cd ..
```

### Step 3: Run the Services
Open 3 terminal windows (or run `npm run dev` from root):

**Terminal 1 - Node.js Backend API (Port 4000)**:
```bash
cd backend
npm run dev
# Server listening on http://localhost:4000
# Swagger UI available at http://localhost:4000/api-docs
```

**Terminal 2 - Python FastAPI Analytics (Port 8000)**:
```bash
cd analytics-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Interactive Docs available at http://localhost:8000/docs
```

**Terminal 3 - Next.js Frontend (Port 3000)**:
```bash
cd frontend
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 3. Pre-Seeded Evaluation Accounts
WorkSphere comes pre-seeded with two distinct organizations to test all 5 roles and multi-tenancy:

### Organization 1: Acme Corporation (Enterprise)
| Role | Email | Password | Key Privileges |
|---|---|---|---|
| **Platform Admin** | `admin@worksphere.io` | `Password123!` | Cross-tenant inspection, platform console |
| **Org Owner** | `owner@acme.com` | `Password123!` | Full organization management, invitations |
| **Project Manager**| `pm@acme.com` | `Password123!` | Projects, milestones, task assignments |
| **Team Member** | `dev@acme.com` | `Password123!` | Task updates, comments, subtasks |
| **Auditor** | `auditor@acme.com` | `Password123!` | Strictly read-only audit log inspection |

### Organization 2: Globex Industries (Pro)
| Role | Email | Password | Purpose |
|---|---|---|---|
| **Globex Owner** | `owner@globex.com` | `Password123!` | Proves Tenant A cannot access Tenant B data |
