import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, ExecutionStatus } from '@ai-qa/shared-types';

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
        findMany: vi.fn(),
      },
      testRunCase: {
        findMany: vi.fn(),
      },
      testResult: {
        findMany: vi.fn(),
      },
      attachment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

describe('Execution Analytics & Attachments Endpoints', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-qa-123';
  const projectId = 'proj-qa-001';

  const qaToken = generateAccessToken({
    sub: userId,
    email: 'qa@example.com',
    orgId,
    role: OrganizationRole.QA_ENGINEER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'qa@example.com',
      firstName: 'Alex',
      lastName: 'QA',
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

  it('GET /api/v1/projects/:projectId/execution-analytics > computes correct pass and completion percentages', async () => {
    vi.mocked(prisma.testRun.findMany).mockResolvedValue([{ id: 'run-1' }] as any);

    vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([
      {
        status: ExecutionStatus.PASSED,
        assignedTo: { id: userId, firstName: 'Alex', lastName: 'QA', email: 'qa@example.com' },
        testRun: { environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
        testCaseVersion: { testCase: { suiteId: 's1', suite: { id: 's1', name: 'Auth' } } },
      },
      {
        status: ExecutionStatus.FAILED,
        assignedTo: { id: userId, firstName: 'Alex', lastName: 'QA', email: 'qa@example.com' },
        testRun: { environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
        testCaseVersion: { testCase: { suiteId: 's1', suite: { id: 's1', name: 'Auth' } } },
      },
      {
        status: ExecutionStatus.BLOCKED,
        assignedTo: null,
        testRun: { environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
        testCaseVersion: { testCase: { suiteId: 's2', suite: { id: 's2', name: 'Billing' } } },
      },
      {
        status: ExecutionStatus.SKIPPED,
        assignedTo: null,
        testRun: { environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
        testCaseVersion: { testCase: { suiteId: 's2', suite: { id: 's2', name: 'Billing' } } },
      },
      {
        status: ExecutionStatus.NOT_RUN,
        assignedTo: null,
        testRun: { environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
        testCaseVersion: { testCase: { suiteId: 's2', suite: { id: 's2', name: 'Billing' } } },
      },
    ] as any);

    vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/execution-analytics`)
      .set('Authorization', `Bearer ${qaToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.totalCases).toBe(5);
    expect(data.notRun).toBe(1);
    expect(data.passed).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.blocked).toBe(1);
    expect(data.skipped).toBe(1);

    // Executed = 4, Total = 5
    // Completion rate = 4 / 5 * 100 = 80%
    expect(data.completionPercentage).toBe(80);

    // Pass rate among executed = 1 passed / 4 executed = 25%
    expect(data.passPercentage).toBe(25);
    expect(data.bySuite).toHaveLength(2);
    expect(data.byEnvironment).toHaveLength(1);
    expect(data.byTester).toHaveLength(1);
  });

  it('GET /api/v1/projects/:projectId/execution-analytics > handles empty test run scenario without errors', async () => {
    vi.mocked(prisma.testRun.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/execution-analytics`)
      .set('Authorization', `Bearer ${qaToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCases).toBe(0);
    expect(res.body.data.passPercentage).toBe(0);
    expect(res.body.data.completionPercentage).toBe(0);
  });

  it('POST /api/v1/projects/:projectId/attachments > rejects forbidden file types (e.g. .exe / .sh) with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/attachments`)
      .set('Authorization', `Bearer ${qaToken}`)
      .set('x-organization-id', orgId)
      .attach('file', Buffer.from('#!/bin/sh\nrm -rf /'), {
        filename: 'malicious.sh',
        contentType: 'application/x-sh',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/projects/:projectId/attachments > accepts valid image attachment and returns metadata', async () => {
    const mockAttachment = {
      id: 'att-123',
      projectId,
      fileName: 'screenshot.png',
      fileSize: 1024,
      mimeType: 'image/png',
      fileUrl: `/api/v1/projects/${projectId}/attachments/att-123/download`,
      storageKey: 'key-123',
      uploadedById: userId,
      testResultId: null,
      defectId: null,
      createdAt: new Date(),
      uploadedBy: { id: userId, email: 'qa@example.com', firstName: 'Alex', lastName: 'QA' },
    };

    vi.mocked(prisma.attachment.create).mockResolvedValue(mockAttachment as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/attachments`)
      .set('Authorization', `Bearer ${qaToken}`)
      .set('x-organization-id', orgId)
      .attach('file', Buffer.from('fake-png-data'), {
        filename: 'screenshot.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('screenshot.png');
    expect(res.body.data.mimeType).toBe('image/png');
  });
});
