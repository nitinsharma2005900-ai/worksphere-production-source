import { Router, Request, Response } from 'express';
import { store } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';

const router = Router();

// GET /api/v1/activities
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const projectId = req.query.projectId as string | undefined;
  const taskId = req.query.taskId as string | undefined;

  let list = Array.from(store.activityEvents.values()).filter(a => a.organizationId === orgId);
  if (projectId) list = list.filter(a => a.projectId === projectId);
  if (taskId) list = list.filter(a => a.taskId === taskId);

  // Sort descending by created_at
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const enriched = list.map(a => {
    const user = store.users.get(a.userId);
    return {
      ...a,
      userName: user?.name || 'System User',
      userEmail: user?.email || ''
    };
  });

  return res.json({ success: true, data: enriched, requestId: req.id });
});

export default router;
