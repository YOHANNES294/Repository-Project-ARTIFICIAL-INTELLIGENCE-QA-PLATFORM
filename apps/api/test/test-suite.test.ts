import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole } from '@ai-qa/shared-types';

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
        findFirst: vi.fn(),
      },
      testSuite: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

describe('Hierarchical Test Suite Management (/api/v1/projects/:projectId/suites)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-eng-123';
  const projectId = 'proj-qa-001';

  const engineerToken = generateAccessToken({
    sub: userId,
    email: 'engineer@example.com',
    orgId,
    role: OrganizationRole.QA_ENGINEER,
  });

  const managerToken = generateAccessToken({
    sub: 'user-mgr-789',
    email: 'manager@example.com',
    orgId,
    role: OrganizationRole.QA_MANAGER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'engineer@example.com',
      firstName: 'QA',
      lastName: 'Engineer',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-eng',
      organizationId: orgId,
      userId,
      role: OrganizationRole.QA_ENGINEER,
    } as any);

    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: projectId,
      organizationId: orgId,
      name: 'Core Platform',
      key: 'CORE',
    } as any);
  });

  it('POST /api/v1/projects/:projectId/suites > creates root suite and child suite', async () => {
    const parentSuite = {
      id: 'suite-root',
      projectId,
      parentId: null,
      name: 'Authentication Module',
      description: 'Covers login, signup, and 2FA',
      objectives: '100% smoke coverage',
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { testCases: 0, children: 0 },
    };

    vi.mocked(prisma.testSuite.create).mockResolvedValue(parentSuite as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/suites`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        name: 'Authentication Module',
        description: 'Covers login, signup, and 2FA',
        objectives: '100% smoke coverage',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Authentication Module');
  });

  it('GET /api/v1/projects/:projectId/suites > returns nested hierarchical tree with parent-child relationship', async () => {
    const flatSuites = [
      {
        id: 'suite-root',
        projectId,
        parentId: null,
        name: 'Root Suite',
        description: null,
        objectives: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { testCases: 5, children: 1 },
      },
      {
        id: 'suite-child',
        projectId,
        parentId: 'suite-root',
        name: 'Child Suite',
        description: null,
        objectives: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { testCases: 3, children: 0 },
      },
    ];

    vi.mocked(prisma.testSuite.findMany).mockResolvedValue(flatSuites as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/suites`)
      .set('Authorization', `Bearer ${engineerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should have 1 root node with nested children
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('suite-root');
    expect(res.body.data[0].children).toHaveLength(1);
    expect(res.body.data[0].children[0].id).toBe('suite-child');
  });

  it('PATCH /api/v1/projects/:projectId/suites/:suiteId > prevents setting suite as its own parent with 400', async () => {
    const suiteId = 'a0000000-0000-4000-8000-000000000001';
    vi.mocked(prisma.testSuite.findFirst).mockResolvedValue({
      id: suiteId,
      projectId,
      name: 'Auth Suite',
    } as any);

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/suites/${suiteId}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        parentId: suiteId, // Self-reference
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/projects/:projectId/suites/:suiteId > prevents circular descendant hierarchy move with 400', async () => {
    const suiteAId = 'a0000000-0000-4000-8000-000000000001';
    const suiteBId = 'b0000000-0000-4000-8000-000000000002';
    const suiteCId = 'c0000000-0000-4000-8000-000000000003';

    // Suppose hierarchy is: A -> B -> C
    // Moving A into C would create a circular loop: C's parent is B, B's parent is A!
    vi.mocked(prisma.testSuite.findFirst)
      .mockResolvedValueOnce({ id: suiteAId, projectId, name: 'A' } as any) // existing
      .mockResolvedValueOnce({ id: suiteCId, projectId, name: 'C' } as any); // parent check

    vi.mocked(prisma.testSuite.findUnique)
      .mockResolvedValueOnce({ parentId: suiteBId } as any) // C's parent is B
      .mockResolvedValueOnce({ parentId: suiteAId } as any); // B's parent is A -> Circular loop detected!

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/suites/${suiteAId}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        parentId: suiteCId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/circular reference/i);
  });

  it('DELETE /api/v1/projects/:projectId/suites/:suiteId > allows QA_MANAGER to delete test suite', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-mgr-789',
      email: 'manager@example.com',
      firstName: 'Manager',
      lastName: 'User',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-mgr',
      organizationId: orgId,
      userId: 'user-mgr-789',
      role: OrganizationRole.QA_MANAGER,
    } as any);

    vi.mocked(prisma.testSuite.findFirst).mockResolvedValue({
      id: 'suite-to-del',
      projectId,
      name: 'Deprecated Suite',
    } as any);

    vi.mocked(prisma.testSuite.delete).mockResolvedValue({} as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/suites/suite-to-del`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/deleted successfully/i);
  });
});
