# WorkSphere – System Architecture & Data Flow

## 1. Architectural Overview
WorkSphere adopts a modular service-oriented architecture where:
- **Next.js 14 App Router** handles user presentation, client state management, and real-time UI synchronization.
- **Express.js API** acts as the authoritative primary business gateway and system of record controller.
- **FastAPI Analytics Service** runs independently as a high-performance Python microservice dedicated to statistics, team workload utilization, and chunked streaming exports.
- **PostgreSQL 16** serves as the relational system of record with normalized schemas and tenant foreign keys.
- **Redis 7 & BullMQ** drive background asynchronous job execution, email dispatch, and dead-letter queues.

---

## 2. Component & Network Topology

```mermaid
flowchart TD
    subgraph Frontend_Layer ["Client & Edge Layer"]
        Browser["Desktop & Mobile Web Browsers"]
        Nginx["Nginx Reverse Proxy & Load Balancer (:80 / :443)"]
        NextJS["Next.js 14 Web Application (:3000)"]
    end

    subgraph Backend_Layer ["Application & Business Logic"]
        ExpressAPI["Node.js / Express Core REST API (:4000)"]
        SocketServer["Socket.IO Real-time Engine (:4000)"]
        FastAPIService["Python FastAPI Analytics Engine (:8000)"]
        WorkerProcess["BullMQ Resilient Worker Process"]
    end

    subgraph Persistence_Layer ["Data & Storage Layer"]
        Postgres[("PostgreSQL 16 Multi-Tenant DB (:5432)")]
        RedisStore[("Redis 7 Cache & Job Queue (:6379)")]
        MinIOStore[("MinIO S3-Compatible Object Store (:9000)")]
    end

    Browser -->|HTTP & WebSocket| Nginx
    Nginx -->|Port 3000| NextJS
    Nginx -->|Port 4000| ExpressAPI
    Nginx -->|WSS :4000| SocketServer

    ExpressAPI -->|Internal HTTP + X-Internal-Key| FastAPIService
    ExpressAPI -->|Prisma Relational Pool| Postgres
    ExpressAPI -->|Job Scheduling| RedisStore
    ExpressAPI -->|File Stream Storage| MinIOStore

    WorkerProcess -->|Consume Jobs| RedisStore
    WorkerProcess -->|Read / Write State| Postgres
    SocketServer -.->|Broadcast State Updates| Browser
```

---

## 3. Data Flow: Optimistic Locking Task Update

The sequence below illustrates how WorkSphere resolves concurrent task updates and prevents silent overwrites:

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Developer (User A)
    actor UserB as Project Manager (User B)
    participant Server as WorkSphere Core API
    participant Store as PostgreSQL System of Record
    participant Sockets as Socket.IO Broadcast

    Note over UserA, UserB: Both fetch Task #101 at Version 1
    UserA->>Server: GET /tasks/101
    Server-->>UserA: 200 OK (Task #101, version: 1)
    UserB->>Server: GET /tasks/101
    Server-->>UserB: 200 OK (Task #101, version: 1)

    Note over UserA, Server: User A submits first
    UserA->>Server: PATCH /tasks/101 (status: "IN_PROGRESS", version: 1)
    Server->>Store: UPDATE tasks SET status='IN_PROGRESS', version=2 WHERE id=101 AND version=1
    Store-->>Server: Rows affected: 1
    Server->>Sockets: emit("task:updated", { id: 101, version: 2 })
    Server-->>UserA: 200 OK (Updated Task, version: 2)

    Note over UserB, Server: User B submits stale update
    UserB->>Server: PATCH /tasks/101 (status: "DONE", version: 1)
    Server->>Store: Verify version matches (Server: 2 vs Client: 1)
    Server->>Sockets: emit("task:conflict", { taskId: 101, serverVersion: 2 })
    Server-->>UserB: 409 Conflict (STALE_OBJECT_STATE error)
    Note over UserB: Client UI refreshes state and displays conflict notification
```

---

## 4. Service Boundaries & Entity Ownership

| Service | Primary Responsibility | Data Entities Owned |
|---------|------------------------|---------------------|
| **Node.js Express API** | Authoritative business logic, auth, tenant validation, CRUD operations | Organizations, Users, Memberships, Projects, Milestones, Tasks, Comments, Audit Logs |
| **FastAPI Analytics Service** | Stateless computational analytics, metric aggregation, data streaming | Project health scores, workload metrics, cycle time stats, CSV/JSON report exports |
| **BullMQ Worker** | Background asynchronous execution, retry backoff, email delivery | Job events, idempotency keys, dead-letter recovery |
| **Socket.IO Real-time Engine** | Event broadcast, room subscription (`org:ID`, `project:ID`) | Ephemeral client connections and presence state |
