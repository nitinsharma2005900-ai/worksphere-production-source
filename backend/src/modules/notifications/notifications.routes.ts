import { Router, Request, Response, NextFunction } from 'express';
import { store } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();

// GET /api/v1/notifications
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.organizationId!;

  const notifs = Array.from(store.notifications.values())
    .filter(n => n.userId === userId && n.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return res.json({
    success: true,
    data: {
      notifications: notifs,
      unreadCount
    },
    requestId: req.id
  });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notif = store.notifications.get(req.params.id);
    if (!notif || notif.userId !== req.user!.userId) {
      throw new NotFoundError('Notification not found');
    }

    notif.isRead = true;
    store.notifications.set(notif.id, notif);
    return res.json({ success: true, data: notif, requestId: req.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/read-all
router.post('/read-all', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.organizationId!;

  for (const n of store.notifications.values()) {
    if (n.userId === userId && n.organizationId === orgId) {
      n.isRead = true;
    }
  }

  return res.json({ success: true, data: { message: 'All notifications marked as read' }, requestId: req.id });
});

export default router;
