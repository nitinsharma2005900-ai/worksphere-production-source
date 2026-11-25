import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';
import { store } from '../src/database/db';
import { jobQueue } from '../src/jobs/queue';
import { IdempotencyManager } from '../src/jobs/idempotency';

const app = createApp();

describe('Domain-Specific Capstone Challenge - Concurrency & Job Idempotency', () => {
  let devToken: string;
  let pmToken: string;

  beforeEach(async () => {
    await seedDatabase();

    const devLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });
    devToken = devLogin.body.data.accessToken;

    const pmLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'pm@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });
    pmToken = pmLogin.body.data.accessToken;
  });

  it('Capstone: Prevents silent overwrite when two users concurrently update the same task', async () => {
    const taskId = 'tsk-acme-001';

    // 1. Both User A (Dev) and User B (PM) view the task at version 1
    const initialGet = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101');

    expect(initialGet.status).toBe(200);
    const initialVersion = initialGet.body.data.version;
    expect(initialVersion).toBe(1);

    // 2. User A successfully commits update with version 1
    const userAUpdate = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        title: 'User A Modified Title',
        status: 'IN_REVIEW',
        version: 1
      });

    expect(userAUpdate.status).toBe(200);
    expect(userAUpdate.body.data.title).toBe('User A Modified Title');
    expect(userAUpdate.body.data.version).toBe(2);

    // 3. User B attempts to commit with stale version 1
    const userBUpdate = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        title: 'User B Conflicting Overwrite Title',
        status: 'DONE',
        version: 1 // STALE VERSION
      });

    // Expect HTTP 409 Conflict
    expect(userBUpdate.status).toBe(409);
    expect(userBUpdate.body.success).toBe(false);
    expect(userBUpdate.body.error.code).toBe('STALE_OBJECT_STATE');
    expect(userBUpdate.body.error.message).toContain('Stale update rejected');

    // 4. Verify that User A's changes were preserved and not overwritten
    const checkTask = store.tasks.get(taskId);
    expect(checkTask?.title).toBe('User A Modified Title');
    expect(checkTask?.version).toBe(2);

    // 5. Verify activity history recorded the update
    const activities = Array.from(store.activityEvents.values()).filter(a => a.taskId === taskId);
    expect(activities.some(a => a.action === 'TASK_UPDATED')).toBe(true);
  });

  it('Capstone: Background job retries do NOT dispatch duplicate notifications', async () => {
    const fixedKey = 'idempotent-task-alert-key-42';
    const orgId = 'org-acme-101';

    // 1. First execution
    const firstRun = await jobQueue.processJob({
      jobName: 'SEND_TASK_NOTIFICATION',
      organizationId: orgId,
      idempotencyKey: fixedKey,
      payload: {
        userId: 'usr-acme-dev',
        title: 'Review Requested',
        message: 'Please review code changes'
      }
    });

    expect(firstRun.notificationId).toBeDefined();

    const notifCountBefore = Array.from(store.notifications.values()).filter(
      n => n.title === 'Review Requested'
    ).length;
    expect(notifCountBefore).toBe(1);

    // 2. Worker retry with identical idempotencyKey
    const retryRun = await jobQueue.processJob({
      jobName: 'SEND_TASK_NOTIFICATION',
      organizationId: orgId,
      idempotencyKey: fixedKey,
      payload: {
        userId: 'usr-acme-dev',
        title: 'Review Requested',
        message: 'Please review code changes'
      }
    });

    expect(retryRun.skipped).toBe(true);
    expect(retryRun.reason).toBe('IDEMPOTENT_DUPLICATE_OR_DLQ');

    // Count must remain exactly 1 (no duplicate notification created)
    const notifCountAfter = Array.from(store.notifications.values()).filter(
      n => n.title === 'Review Requested'
    ).length;
    expect(notifCountAfter).toBe(1);
  });
});
