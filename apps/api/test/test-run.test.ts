import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, TestRunStatus, ExecutionStatus } from '@ai-qa/shared-types';

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
        findUnique: vi.fn(),
      },
      testPlanCase: {
        findMany: vi.fn(),
      },
      testCase: {
        findMany: vi.fn(),
      },
      testRun: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      testRunCase: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    },
  };
});

describe('Test Run Management Endpoints (/api/v1/projects/:projectId/test-runs)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-lead-123';
  const projectId = 'proj-qa-001';
  const runId = 'run-001';

  const leadToken = generateAccessToken({
    sub: userId,
    email: 'lead@example.com',
    orgId,
    role: OrganizationRole.QA_MANAGER,
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

  it('POST /api/v1/projects/:projectId/test-runs > creates test run with test plan cases and returns key', async () => {
    vi.mocked(prisma.testRun.findFirst).mockResolvedValue(null);

    const createdRun = {
      id: runId,
      projectId,
      runNumber: 1,
      name: 'Smoke Test Pass - Sprint 24',
      description: 'Quick sanity verification',
      status: TestRunStatus.NOT_STARTED,
      isAutomated: false,
      testPlanId: '00000000-0000-4000-8000-000000000001',
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      testPlan: { id: '00000000-0000-4000-8000-000000000001', name: 'Master Plan' },
      milestone: null,
      environment: null,
      assignedTo: null,
      createdBy: null,
      cases: [],
      _count: { cases: 0 },
    };

    vi.mocked(prisma.testPlan.findUnique).mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      projectId,
    } as any);

    vi.mocked(prisma.testPlanCase.findMany).mockResolvedValue([
      {
        testCaseId: 'tc-1',
        testCaseVersionId: 'ver-1-snapshot',
        testCase: { versions: [{ id: 'ver-1-snapshot' }] },
      },
    ] as any);

    vi.mocked(prisma.testRun.create).mockResolvedValue(createdRun as any);
    vi.mocked(prisma.testRun.findUnique).mockResolvedValue(createdRun as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-runs`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Smoke Test Pass - Sprint 24',
        testPlanId: '00000000-0000-4000-8000-000000000001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(runId);
    expect(res.body.data.key).toBe('CORE-TR-1');
  });

  it('POST /api/v1/projects/:projectId/test-runs/:runId/status > transitions lifecycle status and records timestamps', async () => {
    vi.mocked(prisma.testRun.findUnique).mockResolvedValueOnce({
      id: runId,
      projectId,
      status: TestRunStatus.NOT_STARTED,
      startedAt: null,
      completedAt: null,
      project: { organizationId: orgId },
    } as any);

    vi.mocked(prisma.testRun.update).mockResolvedValueOnce({
      id: runId,
      status: TestRunStatus.IN_PROGRESS,
      startedAt: new Date(),
    } as any);

    vi.mocked(prisma.testRun.findUnique).mockResolvedValueOnce({
      id: runId,
      projectId,
      runNumber: 1,
      name: 'Active Run',
      status: TestRunStatus.IN_PROGRESS,
      startedAt: new Date(),
      completedAt: null,
      cases: [],
      _count: { cases: 0 },
      project: { key: 'CORE' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-runs/${runId}/status`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId)
      .send({
        status: TestRunStatus.IN_PROGRESS,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(TestRunStatus.IN_PROGRESS);
  });

  it('GET /api/v1/projects/:projectId/test-runs/:runId/cases > returns cases with live calculated execution summary', async () => {
    vi.mocked(prisma.testRun.findUnique).mockResolvedValue({
      id: runId,
      projectId,
      project: { key: 'CORE' },
    } as any);

    vi.mocked(prisma.testRunCase.findMany)
      .mockResolvedValueOnce([
        {
          id: 'rc-1',
          testRunId: runId,
          testCaseVersionId: 'ver-1',
          status: ExecutionStatus.PASSED,
          orderIndex: 0,
          assignedTo: null,
          testCaseVersion: {
            title: 'Verify Login',
            testCase: { id: 'tc-1', caseNumber: 101, title: 'Verify Login' },
            steps: [],
          },
          results: [],
        },
      ] as any)
      .mockResolvedValueOnce([
        { status: ExecutionStatus.PASSED },
        { status: ExecutionStatus.FAILED },
        { status: ExecutionStatus.NOT_RUN },
      ] as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/test-runs/${runId}/cases`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.summary.total).toBe(3);
    expect(res.body.meta.summary.passed).toBe(1);
    expect(res.body.meta.summary.failed).toBe(1);
    expect(res.body.meta.summary.notRun).toBe(1);
    expect(res.body.meta.summary.passPercentage).toBe(50); // 1 passed out of 2 executed = 50%
  });

  it('DELETE /api/v1/projects/:projectId/test-runs/:runId > prevents deletion if executed results exist', async () => {
    vi.mocked(prisma.testRun.findUnique).mockResolvedValue({
      id: runId,
      projectId,
      name: 'Run with results',
      project: { organizationId: orgId },
      cases: [
        {
          results: [{ id: 'res-1' }],
        },
      ],
    } as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/test-runs/${runId}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
