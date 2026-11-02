import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, ProjectStatus, ProjectRole } from '@ai-qa/shared-types';

vi.mock('../src/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      projectMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      environment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('Project Management Endpoints (/api/v1/projects)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-mgr-123';

  const managerToken = generateAccessToken({
    sub: userId,
    email: 'manager@example.com',
    orgId,
    role: OrganizationRole.QA_MANAGER,
  });

  const adminToken = generateAccessToken({
    sub: 'user-admin-789',
    email: 'admin@example.com',
    orgId,
    role: OrganizationRole.ADMINISTRATOR,
  });

  const viewerToken = generateAccessToken({
    sub: 'user-viewer-456',
    email: 'viewer@example.com',
    orgId,
    role: OrganizationRole.VIEWER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated user mock
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'manager@example.com',
      firstName: 'Project',
      lastName: 'Manager',
      isSuperAdmin: false,
    } as any);

    // Default active org membership mock
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-123',
      organizationId: orgId,
      userId,
      role: OrganizationRole.QA_MANAGER,
    } as any);
  });

  describe('POST /api/v1/projects', () => {
    it('creates project with initial environments and creator as PROJECT_LEAD', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      const createdProj = {
        id: 'proj-1',
        organizationId: orgId,
        name: 'Core Platform',
        key: 'CORE',
        description: 'Main engine',
        objectives: 'Zero regression defects',
        status: ProjectStatus.ACTIVE,
        isArchived: false,
        archivedAt: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          project: { create: vi.fn().mockResolvedValue(createdProj) },
          projectMember: { create: vi.fn().mockResolvedValue({}) },
          environment: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
        });
      });

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        ...createdProj,
        environments: [
          { id: 'env-1', name: 'Development' },
          { id: 'env-2', name: 'Staging' },
          { id: 'env-3', name: 'Production' },
        ],
        _count: { members: 1, environments: 3, testCases: 0, testRuns: 0, defects: 0 },
      } as any);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          name: 'Core Platform',
          key: 'CORE',
          description: 'Main engine',
          objectives: 'Zero regression defects',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBe('CORE');
      expect(res.body.data.environments.length).toBe(3);
    });

    it('rejects duplicate project key within same organization with 409 Conflict', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 'existing-proj',
        organizationId: orgId,
        key: 'CORE',
      } as any);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          name: 'Core Duplicate',
          key: 'CORE',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('denies project creation to VIEWER role with 403 Forbidden', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-viewer-456',
        email: 'viewer@example.com',
        isSuperAdmin: false,
      } as any);

      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-viewer',
        organizationId: orgId,
        userId: 'user-viewer-456',
        role: OrganizationRole.VIEWER,
      } as any);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', orgId)
        .send({
          name: 'Viewer Project',
          key: 'VIEW',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('lists organization projects with pagination and search filter', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Core Platform',
          key: 'CORE',
          status: ProjectStatus.ACTIVE,
          isArchived: false,
          _count: { members: 2, environments: 3, testCases: 10, testRuns: 2, defects: 1 },
        },
      ] as any);
      vi.mocked(prisma.project.count).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/projects?search=Core&page=1&limit=10')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('returns project details for valid organization member', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        name: 'Core Platform',
        key: 'CORE',
        status: ProjectStatus.ACTIVE,
        environments: [],
        _count: { members: 1, environments: 0, testCases: 0, testRuns: 0, defects: 0 },
      } as any);

      const res = await request(app)
        .get('/api/v1/projects/proj-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('proj-1');
    });

    it('returns 404 for project belonging to another organization (Tenant Isolation)', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/projects/proj-other-org')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Archive, Restore & Delete Lifecycle', () => {
    it('archives project and sets archived status', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        isArchived: false,
      } as any);

      vi.mocked(prisma.project.update).mockResolvedValue({
        id: 'proj-1',
        isArchived: true,
        status: ProjectStatus.ARCHIVED,
      } as any);

      const res = await request(app)
        .post('/api/v1/projects/proj-1/archive')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);
    });

    it('prevents permanent deletion of an unarchived project', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-admin-789',
        email: 'admin@example.com',
        isSuperAdmin: false,
      } as any);
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-admin',
        organizationId: orgId,
        userId: 'user-admin-789',
        role: OrganizationRole.ADMINISTRATOR,
      } as any);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        isArchived: false, // NOT archived
      } as any);

      const res = await request(app)
        .delete('/api/v1/projects/proj-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('must be archived before');
    });

    it('allows deletion when project is archived', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-admin-789',
        email: 'admin@example.com',
        isSuperAdmin: false,
      } as any);
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'mem-admin',
        organizationId: orgId,
        userId: 'user-admin-789',
        role: OrganizationRole.ADMINISTRATOR,
      } as any);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        isArchived: true,
      } as any);
      vi.mocked(prisma.project.delete).mockResolvedValue({} as any);

      const res = await request(app)
        .delete('/api/v1/projects/proj-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Project Members Management', () => {
    it('adds existing organization member to project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: 'proj-1', organizationId: orgId } as any);
      
      // Handle both caller and target member in findUnique
      vi.mocked(prisma.organizationMember.findUnique).mockImplementation(async (query: any) => {
        const uId = query.where?.organizationId_userId?.userId;
        if (uId === userId) {
          return { id: 'mem-mgr', organizationId: orgId, userId, role: OrganizationRole.QA_MANAGER } as any;
        }
        if (uId === '00000000-0000-0000-0000-000000000001') {
          return { id: 'mem-target', organizationId: orgId, userId: uId, role: OrganizationRole.QA_ENGINEER } as any;
        }
        return null;
      });

      // Not yet in project
      vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.projectMember.create).mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: '00000000-0000-0000-0000-000000000001',
        role: ProjectRole.MEMBER,
        user: { id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.com' },
      } as any);

      const res = await request(app)
        .post('/api/v1/projects/proj-1/members')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          userId: '00000000-0000-0000-0000-000000000001',
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects adding user who is NOT a member of the organization (Tenant Isolation)', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: 'proj-1', organizationId: orgId } as any);
      // User is NOT in org!
      vi.mocked(prisma.organizationMember.findUnique).mockImplementation(async (query: any) => {
        if (query.where?.organizationId_userId?.userId === '00000000-0000-0000-0000-000000000099') {
          return null; // Not in organization!
        }
        return { organizationId: orgId, userId, role: OrganizationRole.QA_MANAGER } as any;
      });

      const res = await request(app)
        .post('/api/v1/projects/proj-1/members')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          userId: '00000000-0000-0000-0000-000000000099',
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('does not belong to this organization');
    });
  });

  describe('Project Environments Management', () => {
    it('creates new environment and returns redacted variables', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: 'proj-1', organizationId: orgId } as any);
      vi.mocked(prisma.environment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.environment.create).mockResolvedValue({
        id: 'env-new',
        projectId: 'proj-1',
        name: 'QA Automation',
        type: 'TESTING',
        url: 'https://qa-auto.example.com',
        description: 'Automated runner environment',
        variables: { API_KEY: 'sensitive-token-123', DEBUG: true },
        isActive: true,
      } as any);

      const res = await request(app)
        .post('/api/v1/projects/proj-1/environments')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          name: 'QA Automation',
          type: 'TESTING',
          url: 'https://qa-auto.example.com',
          description: 'Automated runner environment',
          variables: { API_KEY: 'sensitive-token-123', DEBUG: true },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('QA Automation');
      // Verify sensitive secrets are redacted
      expect(res.body.data.variables.API_KEY).toBe('••••••••');
      expect(res.body.data.variables.DEBUG).toBe(true);
    });

    it('rejects duplicate environment name in same project', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: 'proj-1', organizationId: orgId } as any);
      vi.mocked(prisma.environment.findUnique).mockResolvedValue({ id: 'existing-env' } as any);

      const res = await request(app)
        .post('/api/v1/projects/proj-1/environments')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-organization-id', orgId)
        .send({
          name: 'Development',
          type: 'DEVELOPMENT',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});
