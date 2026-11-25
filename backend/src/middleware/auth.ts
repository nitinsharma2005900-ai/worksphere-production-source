import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  currentOrgId?: string;
  role?: 'PLATFORM_ADMIN' | 'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
    }
  }
}

export const authenticateJwt = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    req.user = payload;

    // Optional override header or default to user's currentOrgId
    const headerOrgId = req.headers['x-organization-id'] as string;
    if (headerOrgId) {
      req.organizationId = headerOrgId;
    } else if (payload.currentOrgId) {
      req.organizationId = payload.currentOrgId;
    }

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired', { expiredAt: err.expiredAt }));
    }
    return next(new UnauthorizedError('Invalid access token'));
  }
};
