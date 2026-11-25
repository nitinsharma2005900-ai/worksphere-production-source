import http from 'http';
import { createApp } from './app';
import { setupSocketServer } from './realtime/socket';
import { env } from './config/env';
import { logger } from './config/logger';
import './database/seed'; // Ensure database fixtures are seeded on boot

const app = createApp();
const server = http.createServer(app);

// Setup Socket.IO Server
setupSocketServer(server);

server.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 WorkSphere Backend API is listening on port ${env.PORT}`);
  logger.info(`📖 Swagger Documentation: http://localhost:${env.PORT}/api-docs`);
  logger.info(`🔌 Real-Time Socket.IO Server active on port ${env.PORT}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  logger.info(`=======================================================`);
});

const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down server...`);
  server.close(() => {
    logger.info('WorkSphere server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
