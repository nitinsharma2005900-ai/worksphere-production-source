import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env, isAllowedCorsOrigin } from '../config/env';
import { logger } from '../config/logger';
import { store } from '../database/db';

export let ioServer: SocketIOServer | null = null;

interface SocketJwtPayload {
  currentOrgId?: string;
  isPlatformAdmin?: boolean;
}

/**
 * Derive the organization room from the JWT instead of trusting data supplied
 * by the browser. Platform administrators retain their documented ability to
 * inspect a selected organization; every other role is pinned to the tenant
 * encoded in its access token.
 */
export function resolveSocketOrganization(
  decoded: SocketJwtPayload,
  requestedOrganizationId: unknown
): string | undefined {
  const requestedOrgId = typeof requestedOrganizationId === 'string'
    ? requestedOrganizationId.trim() || undefined
    : undefined;
  const tokenOrgId = decoded.currentOrgId;

  if (!decoded.isPlatformAdmin && !tokenOrgId) {
    throw new Error('Authentication error: Missing organization context');
  }

  if (!decoded.isPlatformAdmin && requestedOrgId && requestedOrgId !== tokenOrgId) {
    throw new Error('Authentication error: Cross-tenant organization access denied');
  }

  return requestedOrgId || tokenOrgId;
}

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as SocketJwtPayload;
      socket.data.user = decoded;
      socket.data.organizationId = resolveSocketOrganization(
        decoded,
        socket.handshake.auth?.organizationId
      );
      next();
    } catch (err) {
      const message = err instanceof Error && err.message.startsWith('Authentication error:')
        ? err.message
        : 'Authentication error: Invalid or expired token';
      return next(new Error(message));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const orgId = socket.data.organizationId;
    logger.info({ socketId: socket.id, userId: user?.userId, orgId }, '🔌 Socket client connected');

    if (orgId) {
      socket.join(`org:${orgId}`);
      socket.join(`org:${orgId}:user:${user.userId}`);
    }

    socket.on('join:project', (projectId: string) => {
      const project = store.projects.get(projectId);
      if (!project || project.organizationId !== orgId) {
        logger.warn({ socketId: socket.id, projectId, orgId }, 'Blocked Socket.IO project-room join outside tenant');
        return;
      }
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
    ioServer.to(`org:${organizationId}:user:${userId}`).emit('notification:new', notification);
  }
};
