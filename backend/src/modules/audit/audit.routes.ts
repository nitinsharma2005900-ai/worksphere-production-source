import { Router, Request, Response } from 'express';
import { store } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

// GET /api/v1/audit - Auditor compliance access
router.get(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('AUDITOR', 'ORG_OWNER', 'PLATFORM_ADMIN'),
  async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    const { resourceType, userId } = req.query;

    let logs = Array.from(store.auditLogs.values()).filter(l => l.organizationId === orgId);
    if (resourceType) logs = logs.filter(l => l.resourceType === resourceType);
    if (userId) logs = logs.filter(l => l.userId === userId);

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const enriched = logs.map(l => {
      const user = l.userId ? store.users.get(l.userId) : null;
      return {
        ...l,
        userName: user?.name || 'System / Unauthenticated',
        userEmail: user?.email || ''
      };
    });

    return res.json({ success: true, data: enriched, requestId: req.id });
  }
);

export default router;
