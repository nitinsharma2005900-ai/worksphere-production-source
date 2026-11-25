import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';
import { store } from '../src/database/db';

const app = createApp();

describe('Assessment 04 - Authentication & Authorization', () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it('should successfully login Acme Owner and return JWT tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.role).toBe('ORG_OWNER');
  });

  it('should reject login with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns an API error for a valid token whose in-memory user no longer exists', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    store.users.clear();

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('should register a new organization and owner account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'founder@newcorp.com',
        password: 'SecurePassword123!',
        name: 'Frank Founder',
        organizationName: 'NewCorp Tech'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('ORG_OWNER');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('does not accept an invitation using a different email address', async () => {
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    const inviteResponse = await request(app)
      .post('/api/v1/invitations')
      .set('Authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({ email: 'invitee@acme.com', role: 'TEAM_MEMBER' });
    expect(inviteResponse.body.data.emailMode).toBe('mock');
    const invitationToken = inviteResponse.body.data.token;

    const registration = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'someone-else@acme.com',
        password: 'SecurePassword123!',
        name: 'Someone Else',
        invitationToken
      });

    expect(registration.status).toBe(409);
    expect(Array.from(store.users.values()).some(user => user.email === 'someone-else@acme.com')).toBe(false);
  });

  it('should forbid auditor role from performing write operations', async () => {
    // 1. Login as auditor
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'auditor@acme.com',
        password: 'Password123!',
        organizationId: 'org-acme-101'
      });

    const token = loginRes.body.data.accessToken;

    // 2. Attempt to create project as Auditor
    const postRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-ID', 'org-acme-101')
      .send({
        name: 'Unauthorized Auditor Project',
        key: 'UAP'
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.success).toBe(false);
  });
});
