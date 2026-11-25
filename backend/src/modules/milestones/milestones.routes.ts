import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBMilestone } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();

const createMilestoneSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    title: z.string().min(2),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional()
  })
});

router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const projectId = req.query.projectId as string;
  let list = Array.from(store.milestones.values()).filter(m => m.organizationId === orgId);
  if (projectId) {
    list = list.filter(m => m.projectId === projectId);
  }
  return res.json({ success: true, data: list, requestId: req.id });
});

router.post(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(createMilestoneSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const { projectId, title, description, dueDate } = req.body;

      const project = store.projects.get(projectId);
      if (!project || project.organizationId !== orgId) {
        throw new NotFoundError('Project not found in this organization');
      }

      const milestoneId = uuidv4();
      const now = new Date().toISOString();
      const newMilestone: DBMilestone = {
        id: milestoneId,
        organizationId: orgId,
        projectId,
        title,
        description: description || null,
        dueDate: dueDate || null,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now
      };
      store.milestones.set(milestoneId, newMilestone);
      return res.status(201).json({ success: true, data: newMilestone, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const m = store.milestones.get(req.params.id);
      if (!m || m.organizationId !== req.organizationId) {
        throw new NotFoundError('Milestone not found');
      }

      Object.assign(m, req.body, { updatedAt: new Date().toISOString() });
      store.milestones.set(m.id, m);
      return res.json({ success: true, data: m, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
