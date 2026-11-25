import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from './errorHandler';

export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // Tenant ID may come from header, query, body, or route param
  const tenantId =
    req.headers['x-organization-id'] as string ||
    req.params.organizationId ||
    req.query.organizationId as string ||
    req.user.currentOrgId;

  if (!tenantId) {
    return next(new ForbiddenError('Tenant organization context is required'));
  }

  // If user is Platform Admin, allow cross-tenant inspection/management
  if (req.user.isPlatformAdmin) {
    req.organizationId = tenantId;
    return next();
  }

  // Non-platform admins CANNOT access data outside their assigned organization
  if (req.user.currentOrgId && req.user.currentOrgId !== tenantId) {
    return next(
      new ForbiddenError('Cross-tenant access violation: You cannot access resources belonging to another organization')
    );
  }

  req.organizationId = tenantId;
  next();
};
