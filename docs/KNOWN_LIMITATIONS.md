# WorkSphere – Known Limitations & Architecture Trade-Offs

## 1. Intentional Architectural Decisions & Trade-Offs
1. **In-Memory Demo Store (Not a PostgreSQL Runtime)**:
   - *Current Behavior*: The Node API reads and writes its organizations, users, projects, tasks, comments, notifications, refresh-token records, and job records in process memory. The Prisma schema and SQL migration files exist, but the route repositories have not yet been migrated to Prisma.
   - *Impact*: Seeded demo accounts are loaded on every process start and any changes are lost when the process restarts or a free Render service sleeps. Horizontal scaling would also split data and Socket.IO events between instances.
   - *Required Before Production*: Replace the `store` access in the API modules with tenant-scoped PostgreSQL/Prisma queries, use atomic database updates for task versions and idempotency keys, and run migrations in the deployment pipeline.

2. **Mock Email Provider for Local Testing**:
   - *Design Choice*: Out-of-the-box `EMAIL_PROVIDER=mock`.
   - *Rationale*: Prevents failed deliveries or billing charges during local evaluation. Full Resend API integration is implemented and activates as soon as `RESEND_API_KEY` is supplied.

3. **In-Process Resilient Queue Fallback for Redis**:
   - *Design Choice*: If Redis connection fails locally, the job queue falls back to an in-memory queue buffer.
   - *Impact*: Pending jobs and idempotency records are lost on a restart when this fallback is active. This is suitable only for local evaluation; deployed environments need Redis and durable idempotency records.

---

## 2. Future Enhancements
- **Assessment 08 integrations**: S3 mode currently throws an unimplemented error. Calendar/webhook and subscription integrations still require implementation and configured sandbox services.
- **Assessment 12 browser tests**: Frontend component tests, Playwright journeys, and live PostgreSQL integration tests are still missing. Passing backend and Python tests does not establish full assessment completion.
- **Assessment 11 delivery pipeline**: The current Actions workflow tests and builds; registry publishing, staging releases, production approval gates, and rollback evidence remain incomplete.
- **Workflow execution**: Workflow CRUD exists, but task updates currently use a hard-coded urgent-priority notification rather than evaluating saved rules.
- **Container verification**: Docker is unavailable on the review machine. Container execution and backup/restore drills have not been verified here.
- **PostgreSQL Repository Migration**: Make the existing PostgreSQL schema the runtime system of record before any production use.
- **Multi-Region Database Replication**: For global low-latency deployments after durable persistence is in place.
- **Full-Text Search Engine**: Integration of Meilisearch or Elasticsearch for querying hundreds of thousands of comments and attachments.
- **Granular Task Access Control**: Adding per-task visibility permissions within projects.
