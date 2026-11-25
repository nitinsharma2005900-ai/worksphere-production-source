import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store, DBInvitation, DBAuditLog } from '../../database/db';
import { authenticateJwt } from '../../middleware/auth';
import { requireTenant } from '../../middleware/tenant';
import { requireRoles, disallowAuditorWrite } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { jobQueue } from '../../jobs/queue';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const router = Router();

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);

const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['ORG_OWNER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'AUDITOR'])
  })
});

// POST /api/v1/invitations - Send invitation
router.post(
  '/',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN', 'PROJECT_MANAGER'),
  disallowAuditorWrite,
  validate(createInviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body;
      const orgId = req.organizationId!;

      // Check for pending invite
      const existing = Array.from(store.invitations.values()).find(
        i => i.organizationId === orgId && i.email.toLowerCase() === email.toLowerCase() && i.status === 'PENDING'
      );
      if (existing) {
        throw new ConflictError('An active invitation is already pending for this email address');
      }

      const inviteId = uuidv4();
      const token = `inv_${uuidv4().replace(/-/g, '')}`;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      const invite: DBInvitation = {
        id: inviteId,
        organizationId: orgId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        status: 'PENDING',
        invitedById: req.user!.userId,
        createdAt: now
      };
      store.invitations.set(inviteId, invite);

      // Dispatch background email job with idempotency key
      const idempotencyKey = `email-invite-${inviteId}`;
      const org = store.organizations.get(orgId);
      const organizationName = org?.name || 'an organization';
      const inviteUrl = new URL('/register', env.APP_URL);
      inviteUrl.searchParams.set('invite', token);
      await jobQueue.dispatch('SEND_EMAIL', orgId, {
        to: invite.email,
        subject: `You have been invited to join ${organizationName} on WorkSphere`,
        text: `You have been invited to join ${organizationName} on WorkSphere as ${role}. Accept your invitation: ${inviteUrl.toString()}`,
        html: `<p>You have been invited to join <strong>${escapeHtml(organizationName)}</strong> on WorkSphere as <strong>${role}</strong>.</p><p><a href="${inviteUrl.toString()}">Accept your invitation</a></p><p>This link expires in 7 days and can only be used with ${escapeHtml(invite.email)}.</p>`
      }, idempotencyKey);

      // Audit log
      const auditId = uuidv4();
      store.auditLogs.set(auditId, {
        id: auditId,
        organizationId: orgId,
        userId: req.user!.userId,
        action: 'INVITATION_SENT',
        resourceType: 'INVITATION',
        resourceId: inviteId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        metadata: { email, role },
        createdAt: now
      });

      return res.status(201).json({
        success: true,
        data: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          token: invite.token,
          expiresAt: invite.expiresAt,
          emailMode: env.EMAIL_PROVIDER
        },
        requestId: req.id
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/invitations - List invitations
router.get('/', authenticateJwt, requireTenant, async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const list = Array.from(store.invitations.values())
    .filter(i => i.organizationId === orgId)
    .map(i => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      token: i.token,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt
    }));
  return res.json({ success: true, data: list, requestId: req.id });
});

// DELETE /api/v1/invitations/:id - Revoke invitation
router.delete(
  '/:id',
  authenticateJwt,
  requireTenant,
  requireRoles('ORG_OWNER', 'PLATFORM_ADMIN'),
  disallowAuditorWrite,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invite = store.invitations.get(req.params.id);
      if (!invite || invite.organizationId !== req.organizationId) {
        throw new NotFoundError('Invitation not found');
      }

      invite.status = 'CANCELLED';
      store.invitations.set(invite.id, invite);
      return res.json({ success: true, data: { message: 'Invitation cancelled' }, requestId: req.id });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
