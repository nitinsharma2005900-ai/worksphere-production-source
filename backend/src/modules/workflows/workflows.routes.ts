import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBWorkflowRule } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError } from '../../middleware/errorHandler';

const router = Router();

const createWorkflowSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    triggerType: z.string().min(2),
    triggerConfig: z.record(z.any()).default({}),
    actionType: z.string().min(2),
    actionConfig: z.record(z.any()).default({})
  })
});

router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const rules = Array.from(store.workflowRules.values()).filter(w => w.organizationId === orgId);
  return res.json({ success: true, data: rules, requestId: req.id });
});

router.post(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(createWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const wfId = uuidv4();
      const now = new Date().toISOString();

      const newRule: DBWorkflowRule = {
        id: wfId,
        organizationId: orgId,
        name: req.body.name,
        description: req.body.description || null,
        isActive: true,
        triggerType: req.body.triggerType,
        triggerConfig: req.body.triggerConfig,
        actionType: req.body.actionType,
        actionConfig: req.body.actionConfig,
        createdAt: now,
        updatedAt: now
      };
      store.workflowRules.set(wfId, newRule);
      return res.status(201).json({ success: true, data: newRule, requestId: req.id });
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
      const rule = store.workflowRules.get(req.params.id);
      if (!rule || rule.organizationId !== req.organizationId) {
        throw new NotFoundError('Workflow rule not found');
      }

      Object.assign(rule, req.body, { updatedAt: new Date().toISOString() });
      store.workflowRules.set(rule.id, rule);
      return res.json({ success: true, data: rule, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN'),
  disallowAuditorWrite,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = store.workflowRules.get(req.params.id);
      if (!rule || rule.organizationId !== req.organizationId) {
        throw new NotFoundError('Workflow rule not found');
      }

      store.workflowRules.delete(rule.id);
      return res.json({ success: true, data: { message: 'Workflow rule deleted' }, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
