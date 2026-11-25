import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, taskDb, DBTask, DBActivityEvent, DBAuditLog } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { realtimeEmitter } from '../../realtime/socket';
import { jobQueue } from '../../jobs/queue';
import { NotFoundError, OptimisticLockError, ForbiddenError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

const router = Router();

const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().min(1),
    milestoneId: z.string().min(1).optional(),
    title: z.string().min(2),
    description: z.string().optional(),
    status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.number().nonnegative().optional(),
    actualHours: z.number().nonnegative().optional(),
    assigneeId: z.string().min(1).optional()
  })
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    estimatedHours: z.number().nonnegative().nullable().optional(),
    actualHours: z.number().nonnegative().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    milestoneId: z.string().nullable().optional(),
    // A task write without the version observed by the client can silently
    // overwrite a concurrent change, so it is deliberately required.
    version: z.number().int().positive() // OPTIMISTIC CONCURRENCY LOCK KEY
  })
});

// GET /api/v1/tasks
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const { projectId, status, priority, assigneeId } = req.query;

  let tasks = Array.from(store.tasks.values()).filter(t => t.organizationId === orgId);
  if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (assigneeId) tasks = tasks.filter(t => t.assigneeId === assigneeId);

  // Enrich with assignee info
  const enriched = tasks.map(t => {
    const assignee = t.assigneeId ? store.users.get(t.assigneeId) : null;
    const subtaskCount = Array.from(store.subtasks.values()).filter(s => s.taskId === t.id).length;
    const completedSubtasks = Array.from(store.subtasks.values()).filter(s => s.taskId === t.id && s.completed).length;
    return {
      ...t,
      assigneeName: assignee?.name || null,
      assigneeEmail: assignee?.email || null,
      subtaskCount,
      completedSubtasks
    };
  });

  return res.json({ success: true, data: enriched, requestId: req.id });
});

// POST /api/v1/tasks
router.post(
  '/',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  validate(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const { projectId, milestoneId, title, description, status, priority, dueDate, estimatedHours, actualHours, assigneeId } = req.body;

      const project = store.projects.get(projectId);
      if (!project || project.organizationId !== orgId) {
        throw new NotFoundError('Target project does not exist in this organization');
      }

      const newTask = await taskDb.create({
        organizationId: orgId,
        projectId,
        milestoneId: milestoneId || null,
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours || 0,
        actualHours: actualHours || 0,
        assigneeId: assigneeId || null,
        reporterId: req.user!.userId
      });

      // Record Activity
      const actId = uuidv4();
      const activity: DBActivityEvent = {
        id: actId,
        organizationId: orgId,
        projectId,
        taskId: newTask.id,
        userId: req.user!.userId,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: newTask.id,
        details: { title: newTask.title, status: newTask.status, priority: newTask.priority },
        createdAt: newTask.createdAt
      };
      store.activityEvents.set(actId, activity);

      // Realtime broadcast
      realtimeEmitter.emitTaskCreated(orgId, projectId, newTask);

      // Workflow & notification check
      if (assigneeId && assigneeId !== req.user!.userId) {
        await jobQueue.dispatch('SEND_TASK_NOTIFICATION', orgId, {
          userId: assigneeId,
          title: 'New Task Assignment',
          message: `You were assigned task: "${newTask.title}" in project ${project.name}`,
          link: `/projects/${projectId}/tasks/${newTask.id}`
        });
      }

      return res.status(201).json({ success: true, data: newTask, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/tasks/:id
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = store.tasks.get(req.params.id);
    if (!task || task.organizationId !== req.organizationId) {
      throw new NotFoundError('Task not found in this organization');
    }

    const subtasks = Array.from(store.subtasks.values()).filter(s => s.taskId === task.id);
    const comments = Array.from(store.comments.values())
      .filter(c => c.taskId === task.id)
      .map(c => {
        const u = store.users.get(c.userId);
        return { ...c, userName: u?.name || 'Unknown', userAvatar: u?.avatarUrl || null };
      });
    const attachments = Array.from(store.attachments.values()).filter(a => a.taskId === task.id);
    const activities = Array.from(store.activityEvents.values())
      .filter(a => a.taskId === task.id)
      .map(a => {
        const u = store.users.get(a.userId);
        return { ...a, userName: u?.name || 'System' };
      });

    return res.json({
      success: true,
      data: {
        ...task,
        subtasks,
        comments,
        attachments,
        activities
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/tasks/:id
 * Assessment 02 & Capstone Challenge:
 * Enforces Optimistic Concurrency Control via `version` check.
 */
router.patch(
  '/:id',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const taskId = req.params.id;
      const { version, ...updates } = req.body;

      const existingTask = store.tasks.get(taskId);
      if (!existingTask || existingTask.organizationId !== orgId) {
        throw new NotFoundError('Task not found in this organization');
      }

      // Optimistic locking verification
      if (typeof version === 'number' && existingTask.version !== version) {
        const conflictPayload = {
          taskId,
          serverVersion: existingTask.version,
          clientVersion: version,
          currentTask: existingTask,
          message: `Stale update rejected: Task was modified by another user. Server version is ${existingTask.version}, your version was ${version}.`
        };

        // Realtime broadcast of conflict event
        realtimeEmitter.emitTaskConflict(orgId, existingTask.projectId, conflictPayload);

        logger.warn(conflictPayload, '⚠️ [CONCURRENCY CONFLICT] Optimistic lock mismatch');
        throw new OptimisticLockError(conflictPayload.message, conflictPayload);
      }

      // Track changes for activity history
      const diff: Record<string, { before: any; after: any }> = {};
      for (const [key, val] of Object.entries(updates)) {
        if ((existingTask as any)[key] !== val) {
          diff[key] = { before: (existingTask as any)[key], after: val };
        }
      }

      // Apply update and increment version
      const updatedTask = await taskDb.updateWithVersion(
        orgId,
        taskId,
        existingTask.version,
        updates
      );

      // Record Activity event
      const now = new Date().toISOString();
      const actId = uuidv4();
      const activity: DBActivityEvent = {
        id: actId,
        organizationId: orgId,
        projectId: updatedTask.projectId,
        taskId: updatedTask.id,
        userId: req.user!.userId,
        action: 'TASK_UPDATED',
        entityType: 'TASK',
        entityId: updatedTask.id,
        details: { diff, newVersion: updatedTask.version },
        createdAt: now
      };
      store.activityEvents.set(actId, activity);

      // Realtime broadcast of update
      realtimeEmitter.emitTaskUpdated(orgId, updatedTask.projectId, updatedTask);

      // Workflow evaluation: check if priority changed to URGENT
      if (diff.priority && diff.priority.after === 'URGENT') {
        const idempotencyKey = `wf-urgent-${updatedTask.id}-${updatedTask.version}`;
        await jobQueue.dispatch('SEND_TASK_NOTIFICATION', orgId, {
          userId: updatedTask.reporterId,
          title: 'Urgent Task Alert',
          message: `Task "${updatedTask.title}" has been escalated to URGENT priority.`,
          link: `/projects/${updatedTask.projectId}/tasks/${updatedTask.id}`
        }, idempotencyKey);
      }

      return res.json({ success: true, data: updatedTask, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/tasks/:id
router.delete(
  '/:id',
  authenticateJwt,
  requireTenant,
  disallowAuditorWrite,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const taskId = req.params.id;
      const success = await taskDb.delete(orgId, taskId);
      if (!success) {
        throw new NotFoundError('Task not found');
      }

      return res.json({ success: true, data: { message: 'Task deleted successfully' }, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
