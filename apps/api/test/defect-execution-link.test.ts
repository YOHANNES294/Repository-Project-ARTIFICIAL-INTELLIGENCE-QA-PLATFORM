import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import {
  OrganizationRole,
  DefectStatus,
  DefectSeverity,
  DefectPriority,
  ExecutionStatus,
} from '@ai-qa/shared-types';

vi.mock('../src/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
      defect: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      testResult: {
        findUnique: vi.fn(),
      },
      defectTestLink: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      defectHistory: {
        create: vi.fn(),
      },
      attachment: {
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    },
  };
});

describe('Defect & Test Execution Integration Endpoints', () => {
  const app = createApp();
  const orgId = 'org-qa-123';
  const userId = 'user-qa-1';
  const projectId = 'proj-core-001';

  const validToken = generateAccessToken({
    sub: userId,
    email: 'tester@qa.corp',
    orgId,
    role: OrganizationRole.QA_ENGINEER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'tester@qa.corp',
      firstName: 'Alex',
      lastName: 'Smith',
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-1',
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

  it('POST / creates a defect directly from a failed test execution and auto-links DefectTestLink', async () => {
    const testResultId = '11111111-2222-4333-8444-555555555555';
    const testCaseId = '22222222-3333-4444-8555-666666666666';
    const testRunId = '33333333-4444-4555-8666-777777777777';

    // Mock test result verification
    vi.mocked(prisma.testResult.findUnique).mockResolvedValue({
      id: testResultId,
      status: ExecutionStatus.FAILED,
      actualResult: 'HTTP 500 Internal Server Error returned by login endpoint',
      testRunCase: {
        testRun: { id: testRunId, projectId },
        testCaseVersion: { testCaseId },
      },
    } as any);

    vi.mocked(prisma.defect.findFirst).mockResolvedValue({ defectNumber: 5 } as any);
    vi.mocked(prisma.defect.create).mockResolvedValue({
      id: 'defect-6',
      projectId,
      defectNumber: 6,
      title: 'Failure in TC-101: Login returns HTTP 500',
      description: 'Discovered during Sprint 24 regression run',
      severity: DefectSeverity.HIGH,
      priority: DefectPriority.HIGH,
      status: DefectStatus.NEW,
      project: { id: projectId, key: 'CORE', name: 'Core Platform' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Failure in TC-101: Login returns HTTP 500',
        description: 'Discovered during Sprint 24 regression run',
        severity: 'HIGH',
        priority: 'HIGH',
        testResultId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.key).toBe('CORE-BUG-6');
    expect(prisma.defectTestLink.create).toHaveBeenCalledWith({
      data: {
        defectId: 'defect-6',
        testResultId,
        testCaseId,
        testRunId,
      },
    });
  });

  it('POST / rejects creating defect from test result belonging to another project', async () => {
    const testResultId = '99999999-9999-4999-8999-999999999999';

    vi.mocked(prisma.testResult.findUnique).mockResolvedValue({
      id: testResultId,
      status: ExecutionStatus.FAILED,
      testRunCase: {
        testRun: { id: 'run-other', projectId: 'other-project-id' }, // Mismatch!
        testCaseVersion: { testCaseId: 'case-99' },
      },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Cross-tenant defect attempt',
        description: 'Should fail validation',
        testResultId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid test result ID for this project');
  });

  it('POST /:defectId/links adds another test execution link to an existing defect', async () => {
    const defectId = 'defect-6';
    const testResultId = '11111111-2222-4333-8444-555555555555';
    const testCaseId = '22222222-3333-4444-8555-666666666666';

    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: defectId,
      projectId,
    } as any);

    vi.mocked(prisma.defectTestLink.create).mockResolvedValue({
      id: 'link-2',
      defectId,
      testResultId,
      testCaseId,
      testRunId: null,
      testCase: { id: testCaseId, caseNumber: 101, title: 'User Login' },
      testResult: { id: testResultId, attemptNumber: 2, status: ExecutionStatus.FAILED, executedAt: new Date() },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/${defectId}/links`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        testResultId,
        testCaseId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('link-2');
    expect(prisma.defectHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ field: 'testLink' }),
      })
    );
  });

  it('DELETE /:defectId/links/:linkId removes a test link from a defect', async () => {
    const defectId = 'defect-6';
    const linkId = 'link-2';

    vi.mocked(prisma.defectTestLink.findUnique).mockResolvedValue({
      id: linkId,
      defectId,
      defect: { projectId },
    } as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/defects/${defectId}/links/${linkId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(prisma.defectTestLink.delete).toHaveBeenCalledWith({ where: { id: linkId } });
  });
});
