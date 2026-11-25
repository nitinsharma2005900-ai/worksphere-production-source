import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';

const app = createApp();

describe('Assessment 02 - Projects, Tasks, Comments & Analytics API', () => {
  let devToken: string;

  beforeEach(async () => {
    await seedDatabase();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });
    devToken = loginRes.body.data.accessToken;
  });

  it('creates a new task and adds a comment', async () => {
    // 1. Create task
    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        projectId: 'proj-acme-cloud',
        title: 'New Integration Test Task',
        priority: 'HIGH',
        status: 'TODO'
      });

    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.id;
    expect(taskRes.body.data.version).toBe(1);

    // 2. Add subtask
    const subRes = await request(app)
      .post('/api/v1/subtasks')
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        taskId,
        title: 'Subtask 1'
      });
    expect(subRes.status).toBe(201);

    // 3. Add comment
    const commentRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        content: 'Working on subtask 1 now'
      });

    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.content).toBe('Working on subtask 1 now');

    // 4. Retrieve task details
    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101');

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.subtasks.length).toBe(1);
    expect(getRes.body.data.comments.length).toBe(1);
  });

  it('fetches analytics project health', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/project-health/proj-acme-cloud')
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.health_status).toBeDefined();
  });

  it('queues an organization-scoped analytics email report', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/report/email')
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({ to: 'reports@acme.com' });

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ queued: true, to: 'reports@acme.com' });
    expect(res.body.data.emailMode).toBe('mock');
  });

  it('rejects invalid analytics report recipient addresses', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/report/email')
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({ to: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});
