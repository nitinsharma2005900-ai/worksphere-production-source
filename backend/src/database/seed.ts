import bcrypt from 'bcryptjs';
import { store, DBOrganization, DBUser, DBMembership, DBTeam, DBTeamMember, DBProject, DBProjectMember, DBMilestone, DBTask, DBSubtask, DBComment, DBActivityEvent, DBWorkflowRule, DBNotification, DBAuditLog } from './db';
import { logger } from '../config/logger';

export async function seedDatabase() {
  logger.info('🌱 Seeding database with multi-tenant fixture data...');
  store.clear();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);
  const now = new Date().toISOString();

  // 1. Organizations
  const orgAcme: DBOrganization = {
    id: 'org-acme-101',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    plan: 'ENTERPRISE',
    createdAt: now,
    updatedAt: now
  };

  const orgGlobex: DBOrganization = {
    id: 'org-globex-202',
    name: 'Globex Industries',
    slug: 'globex-ind',
    plan: 'PRO',
    createdAt: now,
    updatedAt: now
  };

  store.organizations.set(orgAcme.id, orgAcme);
  store.organizations.set(orgGlobex.id, orgGlobex);

  // 2. Users
  const users: DBUser[] = [
    {
      id: 'usr-admin-01',
      email: 'admin@worksphere.io',
      name: 'Platform Administrator',
      passwordHash,
      isPlatformAdmin: true,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-acme-owner',
      email: 'owner@acme.com',
      name: 'Alice Acme (Owner)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-acme-pm',
      email: 'pm@acme.com',
      name: 'Bob Miller (Project Manager)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-acme-dev',
      email: 'dev@acme.com',
      name: 'Charlie Brown (Developer)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-acme-auditor',
      email: 'auditor@acme.com',
      name: 'Diana Prince (Auditor)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    // Globex Users
    {
      id: 'usr-globex-owner',
      email: 'owner@globex.com',
      name: 'Hank Scorpio (Globex Owner)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-globex-pm',
      email: 'pm@globex.com',
      name: 'Frank Grimes (Globex PM)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-globex-dev',
      email: 'dev@globex.com',
      name: 'Lionel Hutz (Globex Dev)',
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ];

  for (const u of users) {
    store.users.set(u.id, u);
  }

  // 3. Organization Memberships (5 Roles)
  const memberships: DBMembership[] = [
    { id: 'mem-admin', organizationId: orgAcme.id, userId: 'usr-admin-01', role: 'PLATFORM_ADMIN', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-acme-1', organizationId: orgAcme.id, userId: 'usr-acme-owner', role: 'ORG_OWNER', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-acme-2', organizationId: orgAcme.id, userId: 'usr-acme-pm', role: 'PROJECT_MANAGER', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-acme-3', organizationId: orgAcme.id, userId: 'usr-acme-dev', role: 'TEAM_MEMBER', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-acme-4', organizationId: orgAcme.id, userId: 'usr-acme-auditor', role: 'AUDITOR', status: 'ACTIVE', createdAt: now, updatedAt: now },
    // Globex Memberships
    { id: 'mem-globex-1', organizationId: orgGlobex.id, userId: 'usr-globex-owner', role: 'ORG_OWNER', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-globex-2', organizationId: orgGlobex.id, userId: 'usr-globex-pm', role: 'PROJECT_MANAGER', status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: 'mem-globex-3', organizationId: orgGlobex.id, userId: 'usr-globex-dev', role: 'TEAM_MEMBER', status: 'ACTIVE', createdAt: now, updatedAt: now }
  ];

  for (const m of memberships) {
    store.memberships.set(m.id, m);
  }

  // 4. Teams
  const teamEng: DBTeam = {
    id: 'team-acme-eng',
    organizationId: orgAcme.id,
    name: 'Core Engineering',
    description: 'Cloud infrastructure and core API services',
    createdAt: now,
    updatedAt: now
  };
  store.teams.set(teamEng.id, teamEng);

  // 5. Projects
  const projCloud: DBProject = {
    id: 'proj-acme-cloud',
    organizationId: orgAcme.id,
    teamId: teamEng.id,
    name: 'Cloud Migration 2026',
    key: 'CLM',
    description: 'Migrating legacy services to multi-tenant cloud architecture',
    status: 'ACTIVE',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
    createdById: 'usr-acme-owner',
    createdAt: now,
    updatedAt: now
  };

  const projGlobex: DBProject = {
    id: 'proj-globex-secret',
    organizationId: orgGlobex.id,
    name: 'Project Volcano',
    key: 'VLC',
    description: 'Globex proprietary thermal defense system',
    status: 'ACTIVE',
    createdById: 'usr-globex-owner',
    createdAt: now,
    updatedAt: now
  };

  store.projects.set(projCloud.id, projCloud);
  store.projects.set(projGlobex.id, projGlobex);

  // 6. Milestones
  const milestoneVPC: DBMilestone = {
    id: 'mls-acme-vpc',
    organizationId: orgAcme.id,
    projectId: projCloud.id,
    title: 'VPC & Security Group Hardening',
    description: 'Ensure all subnet routes and firewall ACLs are verified',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'OPEN',
    createdAt: now,
    updatedAt: now
  };
  store.milestones.set(milestoneVPC.id, milestoneVPC);

  // 7. Tasks (with version = 1 for optimistic concurrency control)
  const task1: DBTask = {
    id: 'tsk-acme-001',
    organizationId: orgAcme.id,
    projectId: projCloud.id,
    milestoneId: milestoneVPC.id,
    title: 'Configure Terraform VPC peering module',
    description: 'Implement peering connection between staging and production VPCs with route validation',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    estimatedHours: 12.0,
    actualHours: 8.0,
    assigneeId: 'usr-acme-dev',
    reporterId: 'usr-acme-pm',
    version: 1,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: now
  };

  const task2: DBTask = {
    id: 'tsk-acme-002',
    organizationId: orgAcme.id,
    projectId: projCloud.id,
    title: 'Setup Redis Sentinel failover & BullMQ DLQ',
    description: 'Ensure automated worker restarts and idempotent background event handling',
    status: 'TODO',
    priority: 'URGENT',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    estimatedHours: 8.0,
    actualHours: 0.0,
    assigneeId: 'usr-acme-dev',
    reporterId: 'usr-acme-pm',
    version: 1,
    createdAt: now,
    updatedAt: now
  };

  const taskGlobex: DBTask = {
    id: 'tsk-globex-001',
    organizationId: orgGlobex.id,
    projectId: projGlobex.id,
    title: 'Globex Private Thermal Blueprint',
    description: 'CONFIDENTIAL: Must NEVER be visible or accessible to Acme Corporation',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    reporterId: 'usr-globex-owner',
    assigneeId: 'usr-globex-dev',
    version: 1,
    createdAt: now,
    updatedAt: now
  };

  store.tasks.set(task1.id, task1);
  store.tasks.set(task2.id, task2);
  store.tasks.set(taskGlobex.id, taskGlobex);

  // 8. Subtasks
  const sub1: DBSubtask = {
    id: 'sub-acme-1',
    organizationId: orgAcme.id,
    taskId: task1.id,
    title: 'Write terraform security rules',
    completed: true,
    createdAt: now,
    updatedAt: now
  };
  const sub2: DBSubtask = {
    id: 'sub-acme-2',
    organizationId: orgAcme.id,
    taskId: task1.id,
    title: 'Verify route tables across AZs',
    completed: false,
    createdAt: now,
    updatedAt: now
  };
  store.subtasks.set(sub1.id, sub1);
  store.subtasks.set(sub2.id, sub2);

  // 9. Comments
  const com1: DBComment = {
    id: 'com-acme-1',
    organizationId: orgAcme.id,
    taskId: task1.id,
    userId: 'usr-acme-dev',
    content: 'Terraform plan passed CI pipeline. Ready for security review.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  };
  store.comments.set(com1.id, com1);

  // 10. Activity Event Log
  const act1: DBActivityEvent = {
    id: 'act-acme-1',
    organizationId: orgAcme.id,
    projectId: projCloud.id,
    taskId: task1.id,
    userId: 'usr-acme-pm',
    action: 'TASK_CREATED',
    entityType: 'TASK',
    entityId: task1.id,
    details: { title: task1.title, priority: task1.priority },
    createdAt: task1.createdAt
  };
  store.activityEvents.set(act1.id, act1);

  // 11. Workflow Rule
  const wf1: DBWorkflowRule = {
    id: 'wf-acme-1',
    organizationId: orgAcme.id,
    name: 'Auto-Notify on Urgent Tasks',
    description: 'Dispatches high-priority notification whenever a task is marked URGENT',
    isActive: true,
    triggerType: 'TASK_PRIORITY_URGENT',
    triggerConfig: { priority: 'URGENT' },
    actionType: 'SEND_NOTIFICATION',
    actionConfig: { channel: 'IN_APP', notifyRoles: ['PROJECT_MANAGER', 'ORG_OWNER'] },
    createdAt: now,
    updatedAt: now
  };
  store.workflowRules.set(wf1.id, wf1);

  // 12. Notifications
  const notif1: DBNotification = {
    id: 'ntf-acme-1',
    organizationId: orgAcme.id,
    userId: 'usr-acme-dev',
    title: 'Task Assigned',
    message: 'You have been assigned to: Configure Terraform VPC peering module',
    type: 'TASK_ASSIGNED',
    isRead: false,
    link: `/projects/${projCloud.id}/tasks/${task1.id}`,
    createdAt: now
  };
  store.notifications.set(notif1.id, notif1);

  // 13. Audit Log
  const audit1: DBAuditLog = {
    id: 'aud-acme-1',
    organizationId: orgAcme.id,
    userId: 'usr-acme-owner',
    action: 'ORGANIZATION_INITIALIZED',
    resourceType: 'ORGANIZATION',
    resourceId: orgAcme.id,
    ipAddress: '127.0.0.1',
    userAgent: 'WorkSphere Setup Script',
    metadata: { plan: orgAcme.plan },
    createdAt: now
  };
  store.auditLogs.set(audit1.id, audit1);

  logger.info({
    organizations: store.organizations.size,
    users: store.users.size,
    projects: store.projects.size,
    tasks: store.tasks.size
  }, '✅ Seed fixture data successfully loaded into store');
}
