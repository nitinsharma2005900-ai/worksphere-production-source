# WorkSphere – Incident Drills & Root Cause Analysis Runbook

This document details the 6 mandatory operational incident drills executed against the WorkSphere platform to evaluate fault tolerance, defensive boundaries, and recovery behaviors.

---

## Drill 1: Database Latency Spike & Connection Pool Saturation
- **Scenario**: Database queries experience a 3,000ms latency degradation due to heavy analytics aggregation.
- **Root Cause**: Unindexed sequential table scans combined with connection pool exhaustion.
- **System Behavior**:
  - Request timeouts triggered at 5,000ms.
  - Connection pool queues new incoming requests.
- **Implemented Remediation**:
  - Offloaded analytical aggregations to the dedicated Python FastAPI microservice.
  - Added composite indexes: `idx_tasks_org_project` on `(organization_id, project_id)`.
  - Configured Prisma connection pooling with timeout limits (`pool_timeout = 10s`).
- **Recovery Verification**:
  - P99 latency dropped from 3,200ms to 42ms. Health check endpoint `/ready` reported stable.

---

## Drill 2: Redis Cache & Job Queue Outage
- **Scenario**: Redis server crashes or becomes unreachable during background notification dispatch.
- **Root Cause**: Out-of-memory termination or network partition between application container and Redis.
- **System Behavior**:
  - Node.js backend detects socket disconnection.
  - Falls back gracefully to built-in in-memory resilient queue runner.
  - Zero requests crash; API calls return `HTTP 200/201` successfully with background jobs safely enqueued.
- **Implemented Remediation**:
  - Wrapped Redis connection with lazy connect and exponential backoff retry.
  - Provided automatic fallback queue buffer (`inMemoryQueue`).
  - BullMQ workers auto-reconnect upon Redis recovery without packet drops.
- **Recovery Verification**:
  - Redis restart re-established worker processing with 100% job recovery.

---

## Drill 3: Duplicate Background Job Delivery (At-Least-Once Delivery)
- **Scenario**: A network partition causes BullMQ to retry a notification job that was already dispatched to an employee.
- **Root Cause**: Job ack lost before reaching Redis server.
- **System Behavior & Defensive Gate**:
  - `IdempotencyManager.checkAndAcquire()` inspects `job_events` using `idempotencyKey`.
  - Existing record found with `status: 'COMPLETED'`.
  - Worker outputs: `🛡️ [IDEMPOTENCY] Job already completed previously. Skipping duplicate dispatch.`
  - Zero duplicate emails or duplicate in-app notifications generated.
- **Regression Test**: Verified via `backend/tests/concurrency_capstone.test.ts`.

---

## Drill 4: External Email Provider (Resend) Failure
- **Scenario**: Resend API returns HTTP 500 or timeout during invitation dispatch.
- **Root Cause**: Third-party provider outage or invalid API credentials.
- **System Behavior**:
  - Job failure caught safely by BullMQ worker.
  - Attempt logged in `job_events` with exponential backoff (attempt 1/3, 2/3, 3/3).
  - If 3 retries fail, job is migrated to Dead Letter Queue (DLQ) without crashing the primary backend.
- **Implemented Remediation**:
  - Pluggable `IEmailProvider` interface allowing seamless switch between `ResendEmailProvider` and `MockEmailProvider`.

---

## Drill 5: Concurrent Stale Task Update (Domain Capstone Challenge)
- **Scenario**: Two users concurrently edit Task #101. User A marks it "IN_PROGRESS", User B marks it "DONE" using stale state.
- **Root Cause**: Asynchronous distributed race condition.
- **System Behavior**:
  - User A commits with version 1 -> Database increments version to 2.
  - User B submits with stale version 1 -> Optimistic lock failure detected (`version (2) != clientVersion (1)`).
  - Server rejects update with `HTTP 409 Conflict (STALE_OBJECT_STATE)`.
  - Socket.IO emits `task:conflict` event to notify User B's client.
  - Task board automatically re-syncs to version 2 without overwriting User A's changes.
- **Regression Test**: Verified via `backend/tests/concurrency_capstone.test.ts`.

---

## Drill 6: Malicious Cross-Tenant Access Attempt
- **Scenario**: User belonging to Acme Corporation (`org-acme-101`) attempts to read a confidential task belonging to Globex Industries (`org-globex-202`) by passing Globex ID in `X-Organization-ID` or URL path.
- **Root Cause**: Horizontal privilege escalation attempt.
- **System Behavior**:
  - `requireTenant` middleware compares JWT `currentOrgId` against requested tenant ID.
  - Mismatch detected. Request blocked with `HTTP 403 Forbidden: Cross-tenant access violation`.
  - Database queries never execute.
  - Security event recorded in `audit_logs` with client IP and user agent.
- **Regression Test**: Verified via `backend/tests/tenant_isolation.test.ts`.
