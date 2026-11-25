import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';

const app = createApp();

describe('Assessment 03 & 04 - Multi-Tenant Isolation Enforcement', () => {
  let acmeToken: string;
  let globexToken: string;

  beforeEach(async () => {
    await seedDatabase();

    const acmeLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });
    acmeToken = acmeLogin.body.data.accessToken;

    const globexLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@globex.com',
        password: 'Password123!',
        organizationId: 'org-globex-202'
      });
    globexToken = globexLogin.body.data.accessToken;
  });

  it('Acme user CANNOT access Globex confidential task', async () => {
    // Globex task ID is 'tsk-globex-001'
    const res = await request(app)
      .get('/api/v1/tasks/tsk-globex-001')
      .set('Authorization', `Bearer ${acmeToken}`)
      .set('X-Organization-ID', 'org-acme-101');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('Acme user CANNOT forge X-Organization-ID header to Globex org', async () => {
    // Acme user attempts to set X-Organization-ID to Globex ('org-globex-202')
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${acmeToken}`)
      .set('X-Organization-ID', 'org-globex-202');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Cross-tenant access violation');
  });

  it('Acme user only sees Acme projects in project listing', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${acmeToken}`)
      .set('X-Organization-ID', 'org-acme-101');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const keys = res.body.data.map((p: any) => p.key);
    expect(keys).toContain('CLM'); // Acme project
    expect(keys).not.toContain('VLC'); // Globex secret project must NOT be present
  });
});
