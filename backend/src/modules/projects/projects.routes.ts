import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBProject, DBActivityEvent, DBAuditLog } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';

const router = Router();

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    key: z.string().min(2).max(10).toUpperCase(),
    description: z.string().optional(),
    teamId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional()
  })
});

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional()
  })
});

// GET /api/v1/projects
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const projects = Array.from(store.projects.values())
    .filter(p => p.organizationId === orgId)
    .map(p => {
      const taskCount = Array.from(store.tasks.values()).filter(t => t.projectId === p.id).length;
      const completedTasks = Array.from(store.tasks.values()).filter(t => t.projectId === p.id && t.status === 'DONE').length;
      return {
        ...p,
        taskCount,
        completedTasks,
        progressPercent: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
      };
    });

  return res.json({ success: true, data: projects, requestId: req.id });
});

// POST /api/v1/projects
router.post(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const { name, key, description, teamId, startDate, targetDate } = req.body;

      // Check key uniqueness within tenant
      const existingKey = Array.from(store.projects.values()).find(
        p => p.organizationId === orgId && p.key === key
      );
      if (existingKey) {
        throw new ConflictError(`A project with key '${key}' already exists in your organization`);
      }

      const projectId = uuidv4();
      const now = new Date().toISOString();

      const newProject: DBProject = {
        id: projectId,
        organizationId: orgId,
        teamId: teamId || null,
        name,
        key,
        description: description || null,
        status: 'PLANNING',
        startDate: startDate || null,
        targetDate: targetDate || null,
        createdById: req.user!.userId,
        createdAt: now,
        updatedAt: now
      };
      store.projects.set(projectId, newProject);

      // Audit log & Activity Event
      const actId = uuidv4();
      store.activityEvents.set(actId, {
        id: actId,
        organizationId: orgId,
        projectId,
        userId: req.user!.userId,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: projectId,
        details: { name, key },
        createdAt: now
      });

      return res.status(201).json({ success: true, data: newProject, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/projects/:id
router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = store.projects.get(req.params.id);
    if (!project || project.organizationId !== req.organizationId) {
      throw new NotFoundError('Project not found in this organization');
    }

    const tasks = Array.from(store.tasks.values()).filter(t => t.projectId === project.id);
    const milestones = Array.from(store.milestones.values()).filter(m => m.projectId === project.id);

    return res.json({
      success: true,
      data: {
        ...project,
        taskCount: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'DONE').length,
        tasks,
        milestones
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id
router.patch(
  '/:id',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = store.projects.get(req.params.id);
      if (!project || project.organizationId !== req.organizationId) {
        throw new NotFoundError('Project not found');
      }

      Object.assign(project, req.body, { updatedAt: new Date().toISOString() });
      store.projects.set(project.id, project);

      return res.json({ success: true, data: project, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
