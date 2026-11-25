import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { env } from '../../config/env';
import { store, DBUser, DBOrganization, DBMembership, DBRefreshToken, DBAuditLog } from '../../database/db';
import { validate } from '../../middleware/validate';
import { authenticateJwt } from '../../middleware/auth';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../middleware/errorHandler';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { logger } from '../../config/logger';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2),
    organizationName: z.string().min(2).optional(),
    invitationToken: z.string().optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    organizationId: z.string().optional()
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshFamily: string;
}

// Helpers to issue tokens
function generateTokens(user: DBUser, orgId?: string, role?: string, refreshFamily = uuidv4()): IssuedTokens {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    currentOrgId: orgId,
    role: role || (user.isPlatformAdmin ? 'PLATFORM_ADMIN' : 'TEAM_MEMBER')
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION as any
  });

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      family: refreshFamily,
      // A refresh can happen within the same second as login. A unique JWT ID
      // guarantees that rotation produces a distinct signed credential rather
      // than recreating an otherwise identical token.
      jti: uuidv4(),
      currentOrgId: orgId,
      role: role || (user.isPlatformAdmin ? 'PLATFORM_ADMIN' : 'TEAM_MEMBER')
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRATION as any }
  );

  return { accessToken, refreshToken, refreshFamily };
}

async function persistRefreshToken(userId: string, issued: IssuedTokens): Promise<void> {
  const decoded = jwt.decode(issued.refreshToken) as jwt.JwtPayload | null;
  if (typeof decoded?.jti !== 'string') {
    throw new Error('Unable to persist refresh token without a JWT ID');
  }
  const recordId = uuidv4();
  const now = new Date().toISOString();

  store.refreshTokens.set(recordId, {
    id: recordId,
    userId,
    tokenHash: createHash('sha256').update(issued.refreshToken).digest('hex'),
    tokenId: decoded.jti,
    family: issued.refreshFamily,
    expiresAt: decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: now
  });
}

async function findActiveRefreshToken(
  userId: string,
  tokenId: string,
  token: string
): Promise<DBRefreshToken | undefined> {
  const now = Date.now();

  for (const record of store.refreshTokens.values()) {
    if (
      record.userId !== userId ||
      record.tokenId !== tokenId ||
      record.revokedAt ||
      new Date(record.expiresAt).getTime() <= now
    ) {
      continue;
    }

    if (createHash('sha256').update(token).digest('hex') === record.tokenHash) {
      return record;
    }
  }

  return undefined;
}

// 1. POST /api/v1/auth/register
router.post('/register', authRateLimiter, validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, organizationName, invitationToken } = req.body;

    // Check if user already exists
    const existingUser = Array.from(store.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const invitation = invitationToken
      ? Array.from(store.invitations.values()).find(i => i.token === invitationToken && i.status === 'PENDING')
      : undefined;
    if (invitationToken && !invitation) {
      throw new NotFoundError('Invalid or expired invitation token');
    }
    if (invitation && new Date(invitation.expiresAt).getTime() <= Date.now()) {
      invitation.status = 'EXPIRED';
      store.invitations.set(invitation.id, invitation);
      throw new NotFoundError('Invalid or expired invitation token');
    }
    if (invitation && invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new ConflictError('Use the email address that received this invitation');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();
    const userId = uuidv4();

    const newUser: DBUser = {
      id: userId,
      email: email.toLowerCase(),
      name,
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    store.users.set(userId, newUser);

    let orgId: string;
    let userRole: any = 'ORG_OWNER';

    if (invitation) {
      orgId = invitation.organizationId;
      userRole = invitation.role;
      invitation.status = 'ACCEPTED';
      store.invitations.set(invitation.id, invitation);
    } else {
      // Create new Organization
      orgId = uuidv4();
      const orgName = organizationName || `${name}'s Organization`;
      const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);

      const newOrg: DBOrganization = {
        id: orgId,
        name: orgName,
        slug: orgSlug,
        plan: 'FREE',
        createdAt: now,
        updatedAt: now
      };
      store.organizations.set(orgId, newOrg);
    }

    // Create Membership
    const membershipId = uuidv4();
    const newMembership: DBMembership = {
      id: membershipId,
      organizationId: orgId,
      userId,
      role: userRole,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };
    store.memberships.set(membershipId, newMembership);

    // Audit log
    const auditId = uuidv4();
    store.auditLogs.set(auditId, {
      id: auditId,
      organizationId: orgId,
      userId,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: { email, role: userRole },
      createdAt: now
    });

    const issued = generateTokens(newUser, orgId, userRole);
    await persistRefreshToken(userId, issued);

    return res.status(201).json({
      success: true,
      data: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, isPlatformAdmin: newUser.isPlatformAdmin },
        organizationId: orgId,
        role: userRole,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/v1/auth/login
router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, organizationId } = req.body;

    const user = Array.from(store.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Find memberships
    const userMemberships = Array.from(store.memberships.values()).filter(m => m.userId === user.id && m.status === 'ACTIVE');
    let targetOrgId = organizationId;
    let targetRole: any = 'TEAM_MEMBER';

    if (user.isPlatformAdmin) {
      targetRole = 'PLATFORM_ADMIN';
      if (!targetOrgId && userMemberships.length > 0) {
        targetOrgId = userMemberships[0].organizationId;
      }
    } else {
      if (userMemberships.length === 0) {
        throw new UnauthorizedError('User does not belong to any active organization');
      }
      const matched = targetOrgId ? userMemberships.find(m => m.organizationId === targetOrgId) : userMemberships[0];
      if (!matched) {
        throw new UnauthorizedError('User does not belong to the requested organization');
      }
      targetOrgId = matched.organizationId;
      targetRole = matched.role;
    }

    const issued = generateTokens(user, targetOrgId, targetRole);
    const now = new Date().toISOString();
    await persistRefreshToken(user.id, issued);

    // Audit log
    const auditId = uuidv4();
    store.auditLogs.set(auditId, {
      id: auditId,
      organizationId: targetOrgId || 'PLATFORM',
      userId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'AUTH',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: { email: user.email, role: targetRole },
      createdAt: now
    });

    return res.status(200).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
        organizationId: targetOrgId,
        role: targetRole,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/v1/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch (e) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (
      typeof decoded.userId !== 'string' ||
      typeof decoded.family !== 'string' ||
      typeof decoded.jti !== 'string'
    ) {
      throw new UnauthorizedError('Invalid refresh token payload');
    }

    const activeRefreshToken = await findActiveRefreshToken(decoded.userId, decoded.jti, refreshToken);
    if (!activeRefreshToken || activeRefreshToken.revokedAt) {
      throw new UnauthorizedError('Refresh token has been revoked, rotated, or is no longer valid');
    }

    const user = store.users.get(decoded.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or inactive');
    }

    const memberships = Array.from(store.memberships.values()).filter(m => m.userId === user.id && m.status === 'ACTIVE');
    const requestedOrgId = typeof decoded.currentOrgId === 'string' ? decoded.currentOrgId : undefined;
    const membership = memberships.find(item => item.organizationId === requestedOrgId) || memberships[0];
    const orgId = user.isPlatformAdmin ? requestedOrgId || membership?.organizationId : membership?.organizationId;
    const role = user.isPlatformAdmin ? 'PLATFORM_ADMIN' : membership?.role || 'TEAM_MEMBER';

    // Rotation is transactional at the in-memory-store level: the presented
    // token is revoked before its replacement is recorded. Replaying it now
    // fails, while the replacement keeps the same family for auditability.
    activeRefreshToken.revokedAt = new Date().toISOString();
    store.refreshTokens.set(activeRefreshToken.id, activeRefreshToken);

    const tokens = generateTokens(user, orgId, role, decoded.family);
    await persistRefreshToken(user.id, tokens);
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/v1/auth/logout
router.post('/logout', authenticateJwt, async (req: Request, res: Response) => {
  // Access JWTs are short lived. Revoking all active refresh tokens for this
  // user prevents a logged-out session from silently obtaining a new access
  // token and provides a safe global sign-out for this demo implementation.
  const now = new Date().toISOString();
  for (const record of store.refreshTokens.values()) {
    if (record.userId === req.user!.userId && !record.revokedAt) {
      record.revokedAt = now;
      store.refreshTokens.set(record.id, record);
    }
  }

  // Mark audit
  if (req.user) {
    const auditId = uuidv4();
    store.auditLogs.set(auditId, {
      id: auditId,
      organizationId: req.user.currentOrgId || 'PLATFORM',
      userId: req.user.userId,
      action: 'USER_LOGOUT',
      resourceType: 'AUTH',
      resourceId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      metadata: { email: req.user.email },
      createdAt: new Date().toISOString()
    });
  }
  return res.status(200).json({
    success: true,
    data: { message: 'Successfully logged out and token invalidated' },
    requestId: req.id
  });
});

// 5. GET /api/v1/auth/me
router.get('/me', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = store.users.get(req.user!.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const userMemberships = Array.from(store.memberships.values())
      .filter(m => m.userId === user.id)
      .map(m => {
        const org = store.organizations.get(m.organizationId);
        return {
          id: m.id,
          organizationId: m.organizationId,
          organizationName: org?.name || 'Unknown',
          role: m.role,
          status: m.status
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPlatformAdmin: user.isPlatformAdmin,
          avatarUrl: user.avatarUrl
        },
        currentOrganizationId: req.user!.currentOrgId,
        currentRole: req.user!.role,
        memberships: userMemberships
      },
      requestId: req.id
    });
  } catch (err) {
    next(err);
  }
});

export default router;
