import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';

export let ioServer: SocketIOServer | null = null;

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      socket.data.user = decoded;
      socket.data.organizationId = socket.handshake.auth?.organizationId || decoded.currentOrgId;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const orgId = socket.data.organizationId;
    logger.info({ socketId: socket.id, userId: user?.userId, orgId }, '🔌 Socket client connected');

    if (orgId) {
      socket.join(`org:${orgId}`);
    }

    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      logger.debug({ socketId: socket.id, projectId }, 'Joined project room');
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, '🔌 Socket client disconnected');
    });
  });

  ioServer = io;
  return io;
}

export const realtimeEmitter = {
  emitTaskCreated(organizationId: string, projectId: string, task: any) {
    if (!ioServer) return;
    ioServer.to(`org:${organizationId}`).to(`project:${projectId}`).emit('task:created', task);
  },

  emitTaskUpdated(organizationId: string, projectId: string, task: any) {
    if (!ioServer) return;
    ioServer.to(`org:${organizationId}`).to(`project:${projectId}`).emit('task:updated', task);
  },

  emitTaskConflict(organizationId: string, projectId: string, conflictData: any) {
    if (!ioServer) return;
    ioServer.to(`org:${organizationId}`).to(`project:${projectId}`).emit('task:conflict', conflictData);
  },

  emitCommentAdded(organizationId: string, taskId: string, comment: any) {
    if (!ioServer) return;
    ioServer.to(`org:${organizationId}`).emit('comment:added', { taskId, comment });
  },

  emitNotification(organizationId: string, userId: string, notification: any) {
    if (!ioServer) return;
    ioServer.to(`org:${organizationId}`).emit('notification:new', notification);
  }
};
