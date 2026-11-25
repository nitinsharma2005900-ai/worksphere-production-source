import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBComment, DBActivityEvent } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { realtimeEmitter } from '../../realtime/socket';
import { jobQueue } from '../../jobs/queue';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();

const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment cannot be empty')
  })
});

// GET /api/v1/tasks/:taskId/comments
router.get('/:taskId/comments', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId!;
    const taskId = req.params.taskId;

    const task = store.tasks.get(taskId);
    if (!task || task.organizationId !== orgId) {
      throw new NotFoundError('Task not found in this organization');
    }

    const comments = Array.from(store.comments.values())
      .filter(c => c.taskId === taskId)
      .map(c => {
        const u = store.users.get(c.userId);
        return {
          ...c,
          userName: u?.name || 'Unknown',
          userAvatar: u?.avatarUrl || null,
          userEmail: u?.email || ''
        };
      });

    return res.json({ success: true, data: comments, requestId: req.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks/:taskId/comments
router.post(
  '/:taskId/comments',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  validate(createCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const taskId = req.params.taskId;

      const task = store.tasks.get(taskId);
      if (!task || task.organizationId !== orgId) {
        throw new NotFoundError('Task not found');
      }

      const commentId = uuidv4();
      const now = new Date().toISOString();
      const newComment: DBComment = {
        id: commentId,
        organizationId: orgId,
        taskId,
        userId: req.user!.userId,
        content: req.body.content,
        createdAt: now,
        updatedAt: now
      };
      store.comments.set(commentId, newComment);

      const user = store.users.get(req.user!.userId);
      const enrichedComment = {
        ...newComment,
        userName: user?.name || 'Unknown',
        userAvatar: user?.avatarUrl || null,
        userEmail: user?.email || ''
      };

      // Realtime event
      realtimeEmitter.emitCommentAdded(orgId, taskId, enrichedComment);

      // Notify task assignee if someone else commented
      if (task.assigneeId && task.assigneeId !== req.user!.userId) {
        await jobQueue.dispatch('SEND_TASK_NOTIFICATION', orgId, {
          userId: task.assigneeId,
          title: 'New Comment on Task',
          message: `${user?.name || 'Someone'} commented on "${task.title}": "${req.body.content.slice(0, 50)}..."`,
          link: `/projects/${task.projectId}/tasks/${task.id}`
        });
      }

      return res.status(201).json({ success: true, data: enrichedComment, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
