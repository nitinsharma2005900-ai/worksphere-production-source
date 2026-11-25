import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBSubtask } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();

const createSubtaskSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    title: z.string().min(1),
    dueDate: z.string().datetime().optional()
  })
});

const updateSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional()
  })
});

router.post(
  '/',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  validate(createSubtaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const { taskId, title, dueDate } = req.body;

      const task = store.tasks.get(taskId);
      if (!task || task.organizationId !== orgId) {
        throw new NotFoundError('Parent task not found in this organization');
      }

      const subtaskId = uuidv4();
      const now = new Date().toISOString();
      const newSubtask: DBSubtask = {
        id: subtaskId,
        organizationId: orgId,
        taskId,
        title,
        completed: false,
        dueDate: dueDate || null,
        createdAt: now,
        updatedAt: now
      };
      store.subtasks.set(subtaskId, newSubtask);
      return res.status(201).json({ success: true, data: newSubtask, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  validate(updateSubtaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subtask = store.subtasks.get(req.params.id);
      if (!subtask || subtask.organizationId !== req.organizationId) {
        throw new NotFoundError('Subtask not found');
      }

      Object.assign(subtask, req.body, { updatedAt: new Date().toISOString() });
      store.subtasks.set(subtask.id, subtask);
      return res.json({ success: true, data: subtask, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subtask = store.subtasks.get(req.params.id);
      if (!subtask || subtask.organizationId !== req.organizationId) {
        throw new NotFoundError('Subtask not found');
      }

      store.subtasks.delete(subtask.id);
      return res.json({ success: true, data: { message: 'Subtask deleted' }, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
