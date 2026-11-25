import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBTeam, DBTeamMember } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';

const router = Router();

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional()
  })
});

const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    role: z.enum(['LEADER', 'MEMBER']).default('MEMBER')
  })
});

router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const teams = Array.from(store.teams.values())
    .filter(t => t.organizationId === orgId)
    .map(t => {
      const memberCount = Array.from(store.teamMembers.values()).filter(tm => tm.teamId === t.id).length;
      return { ...t, memberCount };
    });
  return res.json({ success: true, data: teams, requestId: req.id });
});

router.post(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(createTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId!;
      const teamId = uuidv4();
      const now = new Date().toISOString();

      const newTeam: DBTeam = {
        id: teamId,
        organizationId: orgId,
        name: req.body.name,
        description: req.body.description || null,
        createdAt: now,
        updatedAt: now
      };
      store.teams.set(teamId, newTeam);
      return res.status(201).json({ success: true, data: newTeam, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id', authenticateJwt, requireTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = store.teams.get(req.params.id);
    if (!team || team.organizationId !== req.organizationId) {
      throw new NotFoundError('Team not found');
    }

    const members = Array.from(store.teamMembers.values())
      .filter(tm => tm.teamId === team.id)
      .map(tm => {
        const u = store.users.get(tm.userId);
        return {
          id: tm.id,
          userId: tm.userId,
          name: u?.name || 'Unknown',
          email: u?.email || 'Unknown',
          role: tm.role
        };
      });

    return res.json({ success: true, data: { ...team, members }, requestId: req.id });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/members',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(addMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = store.teams.get(req.params.id);
      if (!team || team.organizationId !== req.organizationId) {
        throw new NotFoundError('Team not found');
      }

      const { userId, role } = req.body;
      const existing = Array.from(store.teamMembers.values()).find(tm => tm.teamId === team.id && tm.userId === userId);
      if (existing) {
        throw new ConflictError('User is already a member of this team');
      }

      const memberId = uuidv4();
      const newMember: DBTeamMember = {
        id: memberId,
        teamId: team.id,
        userId,
        role,
        createdAt: new Date().toISOString()
      };
      store.teamMembers.set(memberId, newMember);

      return res.status(201).json({ success: true, data: newMember, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
