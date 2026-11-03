import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, TestPlanStatus, TestPriority } from '@ai-qa/shared-types';

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
      },
      testPlan: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      testPlanCase: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        createMany: vi.fn(),
        delete: vi.fn(),
      },
      testCase: {
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    },
  };
});

describe('Test Plan Management Endpoints (/api/v1/projects/:projectId/test-plans)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-lead-123';
  const projectId = 'proj-qa-001';
  const planId = 'plan-001';

  const leadToken = generateAccessToken({
    sub: userId,
    email: 'lead@example.com',
    orgId,
    role: OrganizationRole.QA_MANAGER,
  });

  const viewerToken = generateAccessToken({
    sub: 'user-viewer-456',
    email: 'viewer@example.com',
    orgId,
    role: OrganizationRole.VIEWER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'lead@example.com',
      firstName: 'QA',
      lastName: 'Lead',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-123',
      organizationId: orgId,
      userId,
      role: OrganizationRole.QA_MANAGER,
    } as any);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      organizationId: orgId,
      name: 'Core Platform',
      key: 'CORE',
    } as any);
  });

  it('POST /api/v1/projects/:projectId/test-plans > creates test plan with valid dates and returns key', async () => {
    vi.mocked(prisma.testPlan.findFirst).mockResolvedValue(null);

    const createdPlan = {
      id: planId,
      projectId,
      planNumber: 1,
      name: 'Release 1.0 Master Test Plan',
      description: 'Comprehensive functional regression plan',
      objectives: 'Verify critical path workflows',
      scope: 'Auth, Dashboard, Project, Execution modules',
      strategy: 'Automated smoke + manual exploratory',
      status: TestPlanStatus.PLANNED,
      priority: TestPriority.HIGH,
      entryCriteria: 'All unit tests passing',
      exitCriteria: 'Zero critical defect open',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-15T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      milestone: null,
      environment: null,
      manager: null,
      _count: { selectedCases: 0, testRuns: 0 },
    };

    vi.mocked(prisma.testPlan.create).mockResolvedValue(createdPlan as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-plans`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Release 1.0 Master Test Plan',
        description: 'Comprehensive functional regression plan',
        objectives: 'Verify critical path workflows',
        scope: 'Auth, Dashboard, Project, Execution modules',
        strategy: 'Automated smoke + manual exploratory',
        status: TestPlanStatus.PLANNED,
        priority: TestPriority.HIGH,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-15T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(planId);
    expect(res.body.data.key).toBe('CORE-TP-1');
    expect(res.body.data.planNumber).toBe(1);
  });

  it('POST /api/v1/projects/:projectId/test-plans > rejects invalid date range (endDate < startDate) with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-plans`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Invalid Plan Dates',
        startDate: '2026-11-30T00:00:00.000Z',
        endDate: '2026-11-01T00:00:00.000Z',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/projects/:projectId/test-plans/:planId/cases > selects test cases preserving exact version snapshot', async () => {
    vi.mocked(prisma.testPlan.findUnique).mockResolvedValue({
      id: planId,
      projectId,
      planNumber: 1,
      project: { id: projectId, organizationId: orgId, key: 'CORE' },
    } as any);

    vi.mocked(prisma.testCase.findMany).mockResolvedValue([
      {
        id: 'tc-001',
        projectId,
        caseNumber: 101,
        title: 'User Login with MFA',
        isArchived: false,
        versions: [{ id: 'ver-v1-snapshot-123', versionNumber: 1 }],
      },
    ] as any);

    vi.mocked(prisma.testPlanCase.findMany)
      .mockResolvedValueOnce([]) // existing assignments check
      .mockResolvedValueOnce([
        {
          id: 'tpc-1',
          testPlanId: planId,
          testCaseId: 'tc-001',
          testCaseVersionId: 'ver-v1-snapshot-123',
          createdAt: new Date(),
          testCase: { id: 'tc-001', caseNumber: 101, title: 'User Login with MFA', suite: null, tags: [] },
          testCaseVersion: { id: 'ver-v1-snapshot-123', versionNumber: 1, steps: [] },
        },
      ] as any);

    vi.mocked(prisma.testPlanCase.createMany).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-plans/${planId}/cases`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId)
      .send({
        testCaseIds: ['00000000-0000-4000-8000-000000000001'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.addedCount).toBe(1);
    expect(res.body.data.planCases[0].testCaseVersionId).toBe('ver-v1-snapshot-123');
  });

  it('DELETE /api/v1/projects/:projectId/test-plans/:planId > prevents deletion if test runs are associated', async () => {
    vi.mocked(prisma.testPlan.findUnique).mockResolvedValue({
      id: planId,
      projectId,
      name: 'Active Plan',
      project: { organizationId: orgId },
      _count: { testRuns: 3 },
    } as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/test-plans/${planId}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/projects/:projectId/test-plans > denies creation to VIEWER role with 403', async () => {
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-viewer',
      organizationId: orgId,
      userId: 'user-viewer-456',
      role: OrganizationRole.VIEWER,
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-plans`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Unauthorized Plan',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
