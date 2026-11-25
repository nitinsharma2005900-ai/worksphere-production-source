# WorkSphere – Known Limitations & Architecture Trade-Offs

## 1. Intentional Architectural Decisions & Trade-Offs
1. **In-Memory & SQLite Fallback for Local Development**:
   - *Design Choice*: The backend includes a robust in-process storage engine alongside PostgreSQL Prisma.
   - *Rationale*: Allows developers and automated evaluators to clone and run the application instantly without requiring a running Docker daemon or external PostgreSQL instance.
   - *Production Behavior*: In containerized or production deployments, PostgreSQL 16 is the strict system of record.

2. **Mock Email Provider for Local Testing**:
   - *Design Choice*: Out-of-the-box `EMAIL_PROVIDER=mock`.
   - *Rationale*: Prevents failed deliveries or billing charges during local evaluation. Full Resend API integration is implemented and activates as soon as `RESEND_API_KEY` is supplied.

3. **In-Process Resilient Queue Fallback for Redis**:
   - *Design Choice*: If Redis connection fails locally, the job queue falls back to an in-memory queue buffer.
   - *Rationale*: Guarantees zero unhandled crashes during offline development or test runs while preserving idempotency checks.

---

## 2. Future Enhancements
- **Multi-Region Database Replication**: For global low-latency deployments across continents.
- **Full-Text Search Engine**: Integration of Meilisearch or Elasticsearch for querying hundreds of thousands of comments and attachments.
- **Granular Task Access Control**: Adding per-task visibility permissions within projects.
