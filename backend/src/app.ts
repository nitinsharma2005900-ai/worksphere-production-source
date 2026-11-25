import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env, isAllowedCorsOrigin } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, NotFoundError } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import orgRoutes from './modules/organizations/organizations.routes';
import inviteRoutes from './modules/invitations/invitations.routes';
import teamRoutes from './modules/teams/teams.routes';
import projectRoutes from './modules/projects/projects.routes';
import milestoneRoutes from './modules/milestones/milestones.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import subtaskRoutes from './modules/subtasks/subtasks.routes';
import commentRoutes from './modules/comments/comments.routes';
import attachmentRoutes from './modules/attachments/attachments.routes';
import activityRoutes from './modules/activities/activities.routes';
import workflowRoutes from './modules/workflows/workflows.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import auditRoutes from './modules/audit/audit.routes';

// Swagger docs
import swaggerDoc from './docs/swagger.json';

export const createApp = () => {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  // Security & utility middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Organization-ID', 'X-Request-ID']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);

  // OpenAPI Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerDoc));

  // Health and readiness endpoints
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'worksphere-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/ready', (_req, res) => {
    res.json({
      status: 'ready',
      database: 'in-memory-demo',
      persistence: 'volatile',
      productionReady: false
    });
  });

  // Apply rate limiter to API routes
  app.use('/api/v1', apiRateLimiter);

  // Mount versioned API modules
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/organizations', orgRoutes);
  app.use('/api/v1/invitations', inviteRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/milestones', milestoneRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/subtasks', subtaskRoutes);
  app.use('/api/v1/tasks', commentRoutes);
  app.use('/api/v1/attachments', attachmentRoutes);
  app.use('/api/v1/activities', activityRoutes);
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/audit', auditRoutes);

  // Catch-all 404 for undefined routes
  app.use((_req, _res, next) => {
    next(new NotFoundError('The requested endpoint does not exist'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
