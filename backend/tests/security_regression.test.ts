import request from 'supertest';
import { createServer, Server } from 'http';
import { io, Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';
import { store } from '../src/database/db';
import { setupSocketServer } from '../src/realtime/socket';

const app = createApp();

describe('Attachment and real-time security regression', () => {
  let token: string;
  beforeEach(async () => {
    await seedDatabase();
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: 'dev@acme.com', password: 'Password123!' });
    token = login.body.data.accessToken;
  });

  it('requires authentication for attachment downloads', async () => {
    const response = await request(app).get('/api/v1/attachments/download/secret.txt');
    expect(response.status).toBe(401);
  });

  it('rejects uploads referencing another tenant before writing any file', async () => {
    const response = await request(app).post('/api/v1/attachments/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('taskId', 'tsk-globex-001')
      .attach('file', Buffer.from('test'), 'example.txt');
    expect(response.status).toBe(404);
    expect(store.attachments.size).toBe(0);
  });

  it('allows only one successful rotation when a refresh token is replayed concurrently', async () => {
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    const results = await Promise.all([1, 2].map(() => request(app)
      .post('/api/v1/auth/refresh').send({ refreshToken: login.body.data.refreshToken })));
    expect(results.map(result => result.status).sort()).toEqual([200, 401]);
  });

  it('rejects a forged organization during a real Socket.IO handshake', async () => {
    const server = createServer(app);
    const sockets = setupSocketServer(server);
    let client: Socket | undefined;
    try {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = server.address() as { port: number };
      client = io(`http://127.0.0.1:${address.port}`, {
        transports: ['websocket'], reconnection: false,
        auth: { token, organizationId: 'org-globex-202' }
      });
      const error = await new Promise<Error>((resolve, reject) => {
        client!.once('connect_error', resolve);
        client!.once('connect', () => reject(new Error('Forged tenant was accepted')));
      });
      expect(error.message).toContain('Cross-tenant');
    } finally {
      client?.disconnect();
      await new Promise<void>(resolve => sockets.close(() => resolve()));
    }
  });
});
