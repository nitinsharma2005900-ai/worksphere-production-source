import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './errorHandler';

export type Role = 'PLATFORM_ADMIN' | 'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR';

export const ROLE_HIERARCHY: Record<Role, number> = {
  PLATFORM_ADMIN: 100,
  ORG_OWNER: 80,
  PROJECT_MANAGER: 60,
  TEAM_MEMBER: 40,
  AUDITOR: 20
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.isPlatformAdmin) {
      return next(); // Platform Admin bypasses role-specific gates
    }

    const userRole = req.user.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(
        new ForbiddenError(
          `Access denied. Required roles: [${allowedRoles.join(', ')}]. Current role: ${userRole || 'NONE'}`
        )
      );
    }

    next();
  };
};

export const requirePlatformAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (!req.user.isPlatformAdmin && req.user.role !== 'PLATFORM_ADMIN') {
    return next(new ForbiddenError('Platform Administrator privilege required'));
  }
  next();
};

export const disallowAuditorWrite = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'AUDITOR' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next(new ForbiddenError('Auditor role is strictly read-only and cannot perform modifications'));
  }
  next();
};
