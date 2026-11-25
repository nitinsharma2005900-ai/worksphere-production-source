import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBOrganization, DBMembership, DBAuditLog } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';

const router = Router();

const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional()
  })
});

// GET /api/v1/organizations - List organizations user has access to (or all if Platform Admin)
router.get('/', authenticateJwt, async (req: Request, res: Response) => {
  if (req.user!.isPlatformAdmin) {
    const all = Array.from(store.organizations.values());
    return res.json({ success: true, data: all, requestId: req.id });
  }

  const userMemberships = Array.from(store.memberships.values()).filter(m => m.userId === req.user!.userId && m.status === 'ACTIVE');
  const orgIds = userMemberships.map(m => m.organizationId);
  const list = Array.from(store.organizations.values()).filter(o => orgIds.includes(o.id));
  return res.json({ success: true, data: list, requestId: req.id });
});

// GET /api/v1/organizations/:id - Get specific organization
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = store.organizations.get(req.params.id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return res.json({ success: true, data: org, requestId: req.id });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/organizations/:id - Update organization (ORG_OWNER or PLATFORM_ADMIN only)
router.patch(
  '/:id',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN'),
  disallowAuditorWrite,
  validate(updateOrgSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = store.organizations.get(req.params.id);
      if (!org) {
        throw new NotFoundError('Organization not found');
      }

      if (req.body.name) org.name = req.body.name;
      if (req.body.plan) org.plan = req.body.plan;
      org.updatedAt = new Date().toISOString();
      store.organizations.set(org.id, org);

      // Audit log
      const auditId = uuidv4();
      store.auditLogs.set(auditId, {
        id: auditId,
        organizationId: org.id,
        userId: req.user!.userId,
        action: 'ORGANIZATION_UPDATED',
        resourceType: 'ORGANIZATION',
        resourceId: org.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        metadata: req.body,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, data: org, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/organizations/:id/members - List members
router.get('/:id/members', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const members = Array.from(store.memberships.values())
    .filter(m => m.organizationId === req.params.id)
    .map(m => {
      const u = store.users.get(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        name: u?.name || 'Unknown',
        email: u?.email || 'Unknown',
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt
      };
    });

  return res.json({ success: true, data: members, requestId: req.id });
});

export default router;
