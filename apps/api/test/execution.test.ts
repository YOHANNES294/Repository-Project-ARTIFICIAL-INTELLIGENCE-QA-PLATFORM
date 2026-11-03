import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, ExecutionStatus, TestRunStatus } from '@ai-qa/shared-types';

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
      testRun: {
        update: vi.fn(),
      },
      testRunCase: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      testResult: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    },
  };
});

describe('Test Execution Workbench Endpoints (/api/v1/projects/:projectId/test-runs/:runId/cases)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-tester-123';
  const projectId = 'proj-qa-001';
  const runId = 'run-001';
  const runCaseId = 'rc-001';

  const testerToken = generateAccessToken({
    sub: userId,
    email: 'tester@example.com',
    orgId,
    role: OrganizationRole.QA_ENGINEER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'tester@example.com',
      firstName: 'Jane',
      lastName: 'Tester',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-123',
      organizationId: orgId,
      userId,
      role: OrganizationRole.QA_ENGINEER,
    } as any);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      organizationId: orgId,
      name: 'Core Platform',
      key: 'CORE',
    } as any);
  });

  it('POST /:runCaseId/execute > auto-calculates FAILED when at least one step fails', async () => {
    vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue({
      id: runCaseId,
      status: ExecutionStatus.NOT_RUN,
      testRun: {
        id: runId,
        projectId,
        status: TestRunStatus.NOT_STARTED,
        startedAt: null,
        project: { organizationId: orgId },
      },
      results: [],
    } as any);

    const mockResult = {
      id: 'res-attempt-1',
      testRunCaseId: runCaseId,
      attemptNumber: 1,
      status: ExecutionStatus.FAILED,
      actualResult: 'Button disabled on click',
      durationMs: 4200,
      executedAt: new Date(),
      executedBy: null,
      stepResults: [
        { stepNumber: 1, status: ExecutionStatus.PASSED, actualResult: 'Loaded' },
        { stepNumber: 2, status: ExecutionStatus.FAILED, actualResult: 'Button disabled' },
      ],
      attachments: [],
    };

    vi.mocked(prisma.testResult.create).mockResolvedValue(mockResult as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/execute`)
      .set('Authorization', `Bearer ${testerToken}`)
      .set('x-organization-id', orgId)
      .send({
        actualResult: 'Button disabled on click',
        durationMs: 4200,
        stepResults: [
          { stepNumber: 1, status: ExecutionStatus.PASSED, actualResult: 'Loaded' },
          { stepNumber: 2, status: ExecutionStatus.FAILED, actualResult: 'Button disabled' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ExecutionStatus.FAILED);
    expect(res.body.data.attemptNumber).toBe(1);
    expect(prisma.testRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: runId },
        data: expect.objectContaining({ status: TestRunStatus.IN_PROGRESS }),
      })
    );
  });

  it('POST /:runCaseId/execute > auto-calculates PASSED when all steps pass', async () => {
    vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue({
      id: runCaseId,
      status: ExecutionStatus.NOT_RUN,
      testRun: {
        id: runId,
        projectId,
        status: TestRunStatus.IN_PROGRESS,
        startedAt: new Date(),
        project: { organizationId: orgId },
      },
      results: [],
    } as any);

    const mockResult = {
      id: 'res-attempt-1',
      testRunCaseId: runCaseId,
      attemptNumber: 1,
      status: ExecutionStatus.PASSED,
      durationMs: 3000,
      executedAt: new Date(),
      executedBy: null,
      stepResults: [
        { stepNumber: 1, status: ExecutionStatus.PASSED },
        { stepNumber: 2, status: ExecutionStatus.PASSED },
      ],
      attachments: [],
    };

    vi.mocked(prisma.testResult.create).mockResolvedValue(mockResult as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/execute`)
      .set('Authorization', `Bearer ${testerToken}`)
      .set('x-organization-id', orgId)
      .send({
        durationMs: 3000,
        stepResults: [
          { stepNumber: 1, status: ExecutionStatus.PASSED },
          { stepNumber: 2, status: ExecutionStatus.PASSED },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ExecutionStatus.PASSED);
  });

  it('POST /:runCaseId/retest > creates attempt #2 without overwriting attempt #1', async () => {
    vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue({
      id: runCaseId,
      status: ExecutionStatus.FAILED,
      testRun: {
        id: runId,
        projectId,
        status: TestRunStatus.IN_PROGRESS,
        startedAt: new Date(),
        project: { organizationId: orgId },
      },
      results: [{ attemptNumber: 1 }],
    } as any);

    const retestResult = {
      id: 'res-attempt-2',
      testRunCaseId: runCaseId,
      attemptNumber: 2,
      status: ExecutionStatus.PASSED,
      comment: '[Retest Notes: Hotfix v1.0.1 applied] Retest succeeded',
      durationMs: 2500,
      executedAt: new Date(),
      executedBy: null,
      stepResults: [{ stepNumber: 1, status: ExecutionStatus.PASSED }],
      attachments: [],
    };

    vi.mocked(prisma.testResult.create).mockResolvedValue(retestResult as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/retest`)
      .set('Authorization', `Bearer ${testerToken}`)
      .set('x-organization-id', orgId)
      .send({
        retestNotes: 'Hotfix v1.0.1 applied',
        comment: 'Retest succeeded',
        durationMs: 2500,
        stepResults: [{ stepNumber: 1, status: ExecutionStatus.PASSED }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attemptNumber).toBe(2);
    expect(res.body.data.status).toBe(ExecutionStatus.PASSED);
  });

  it('GET /:runCaseId/history > returns full chronological attempt chain', async () => {
    vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue({
      id: runCaseId,
      testRun: { id: runId, projectId },
    } as any);

    vi.mocked(prisma.testResult.findMany).mockResolvedValue([
      { id: 'att-1', attemptNumber: 1, status: ExecutionStatus.FAILED, executedAt: new Date() },
      { id: 'att-2', attemptNumber: 2, status: ExecutionStatus.PASSED, executedAt: new Date() },
    ] as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/history`)
      .set('Authorization', `Bearer ${testerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].attemptNumber).toBe(1);
    expect(res.body.data[1].attemptNumber).toBe(2);
  });
});
