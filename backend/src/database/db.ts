import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { OptimisticLockError, NotFoundError } from '../middleware/errorHandler';

export interface DBOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DBMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'PLATFORM_ADMIN' | 'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface DBInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR';
  token: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  invitedById: string;
  createdAt: string;
}

export interface DBTeam {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DBTeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'LEADER' | 'MEMBER';
  createdAt: string;
}

export interface DBProject {
  id: string;
  organizationId: string;
  teamId?: string | null;
  name: string;
  description?: string | null;
  key: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  startDate?: string | null;
  targetDate?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
  createdAt: string;
}

export interface DBMilestone {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: 'OPEN' | 'REACHED' | 'MISSED';
  createdAt: string;
  updatedAt: string;
}

export interface DBTask {
  id: string;
  organizationId: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  assigneeId?: string | null;
  reporterId: string;
  version: number; // Concurrency control version
  createdAt: string;
  updatedAt: string;
}

export interface DBSubtask {
  id: string;
  organizationId: string;
  taskId: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DBComment {
  id: string;
  organizationId: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBAttachment {
  id: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  createdAt: string;
}

export interface DBActivityEvent {
  id: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface DBWorkflowRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actionType: string;
  actionConfig: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DBNotification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface DBAuditLog {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface DBRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  tokenId: string;
  family: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
}

export interface DBJobEvent {
  id: string;
  jobName: string;
  idempotencyKey: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payload: Record<string, any>;
  result?: Record<string, any> | null;
  attempts: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

class InMemoryDataStore {
  public organizations: Map<string, DBOrganization> = new Map();
  public users: Map<string, DBUser> = new Map();
  public memberships: Map<string, DBMembership> = new Map();
  public invitations: Map<string, DBInvitation> = new Map();
  public teams: Map<string, DBTeam> = new Map();
  public teamMembers: Map<string, DBTeamMember> = new Map();
  public projects: Map<string, DBProject> = new Map();
  public projectMembers: Map<string, DBProjectMember> = new Map();
  public milestones: Map<string, DBMilestone> = new Map();
  public tasks: Map<string, DBTask> = new Map();
  public subtasks: Map<string, DBSubtask> = new Map();
  public comments: Map<string, DBComment> = new Map();
  public attachments: Map<string, DBAttachment> = new Map();
  public activityEvents: Map<string, DBActivityEvent> = new Map();
  public workflowRules: Map<string, DBWorkflowRule> = new Map();
  public notifications: Map<string, DBNotification> = new Map();
  public auditLogs: Map<string, DBAuditLog> = new Map();
  public refreshTokens: Map<string, DBRefreshToken> = new Map();
  public jobEvents: Map<string, DBJobEvent> = new Map();

  public clear() {
    this.organizations.clear();
    this.users.clear();
    this.memberships.clear();
    this.invitations.clear();
    this.teams.clear();
    this.teamMembers.clear();
    this.projects.clear();
    this.projectMembers.clear();
    this.milestones.clear();
    this.tasks.clear();
    this.subtasks.clear();
    this.comments.clear();
    this.attachments.clear();
    this.activityEvents.clear();
    this.workflowRules.clear();
    this.notifications.clear();
    this.auditLogs.clear();
    this.refreshTokens.clear();
    this.jobEvents.clear();
  }
}

export const store = new InMemoryDataStore();

// Concurrency-safe Task Repository
export const taskDb = {
  async findById(organizationId: string, id: string): Promise<DBTask | null> {
    const task = store.tasks.get(id);
    if (!task || task.organizationId !== organizationId) return null;
    return { ...task };
  },

  async findMany(organizationId: string, filter?: { projectId?: string; status?: string; assigneeId?: string }): Promise<DBTask[]> {
    const list: DBTask[] = [];
    for (const t of store.tasks.values()) {
      if (t.organizationId !== organizationId) continue;
      if (filter?.projectId && t.projectId !== filter.projectId) continue;
      if (filter?.status && t.status !== filter.status) continue;
      if (filter?.assigneeId && t.assigneeId !== filter.assigneeId) continue;
      list.push({ ...t });
    }
    return list;
  },

  async create(task: Omit<DBTask, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<DBTask> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newTask: DBTask = {
      ...task,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    store.tasks.set(id, newTask);
    return { ...newTask };
  },

  /**
   * Domain-Specific Capstone & Concurrency Requirement:
   * Enforces Optimistic Locking via expectedVersion check.
   */
  async updateWithVersion(
    organizationId: string,
    id: string,
    expectedVersion: number,
    updates: Partial<Omit<DBTask, 'id' | 'organizationId' | 'version' | 'createdAt' | 'updatedAt'>>
  ): Promise<DBTask> {
    const existing = store.tasks.get(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundError(`Task with id ${id} not found in this organization`);
    }

    if (existing.version !== expectedVersion) {
      throw new OptimisticLockError(
        `Optimistic lock failure: Task ${id} has version ${existing.version}, but client expected version ${expectedVersion}. Please refresh the latest state.`
      );
    }

    const now = new Date().toISOString();
    const updated: DBTask = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: now
    };

    store.tasks.set(id, updated);
    return { ...updated };
  },

  async delete(organizationId: string, id: string): Promise<boolean> {
    const existing = store.tasks.get(id);
    if (!existing || existing.organizationId !== organizationId) return false;
    return store.tasks.delete(id);
  }
};
