import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, MilestoneStatus, TestPriority } from '@ai-qa/shared-types';

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
      milestone: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      testRun: {
        findMany: vi.fn(),
      },
      testCase: {
        count: vi.fn(),
      },
      defect: {
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

describe('Project Milestone Management Endpoints (/api/v1/projects/:projectId/milestones)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-mgr-123';
  const projectId = 'proj-qa-001';

  const managerToken = generateAccessToken({
    sub: userId,
    email: 'manager@example.com',
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
      email: 'manager@example.com',
      firstName: 'QA',
      lastName: 'Manager',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-123',
      organizationId: orgId,
      userId,
      role: OrganizationRole.QA_MANAGER,
    } as any);

    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: projectId,
      organizationId: orgId,
      name: 'Core Platform',
      key: 'CORE',
    } as any);
  });

  it('POST /api/v1/projects/:projectId/milestones > creates milestone with valid dates and priority', async () => {
    const createdMilestone = {
      id: 'mile-001',
      projectId,
      name: 'Sprint 24 Release',
      description: 'End of month production drop',
      objectives: 'Zero critical defect escape',
      status: MilestoneStatus.PLANNED,
      priority: TestPriority.HIGH,
      releaseVer: 'v2.4.0',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      dueDate: new Date('2026-11-30T00:00:00.000Z'),
      ownerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: null,
      _count: { testPlans: 0, testRuns: 0, testCases: 0, defects: 0 },
    };

    vi.mocked(prisma.milestone.create).mockResolvedValue(createdMilestone as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sprint 24 Release',
        description: 'End of month production drop',
        objectives: 'Zero critical defect escape',
        priority: 'HIGH',
        releaseVer: 'v2.4.0',
        startDate: '2026-11-01T00:00:00.000Z',
        dueDate: '2026-11-30T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Sprint 24 Release');
    expect(res.body.data.priority).toBe('HIGH');
    expect(res.body.data.progress.completionPercentage).toBe(0);
  });

  it('POST /api/v1/projects/:projectId/milestones > rejects invalid date range (dueDate < startDate) with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Invalid Dates Milestone',
        startDate: '2026-12-01T00:00:00.000Z',
        dueDate: '2026-11-01T00:00:00.000Z', // Prior to start date!
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/projects/:projectId/milestones > lists milestones with real calculated QA progress', async () => {
    const mockMilestones = [
      {
        id: 'mile-001',
        projectId,
        name: 'Alpha Launch',
        description: 'First public alpha',
        objectives: 'Test core flows',
        status: MilestoneStatus.IN_PROGRESS,
        priority: TestPriority.CRITICAL,
        releaseVer: '1.0.0-alpha',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-11-15'),
        completedAt: null,
        ownerId: null,
        owner: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { testPlans: 1, testRuns: 2, testCases: 10, defects: 1 },
        testRuns: [
          {
            id: 'run-1',
            status: 'COMPLETED',
            cases: [
              { status: 'PASSED' },
              { status: 'PASSED' },
              { status: 'FAILED' },
            ],
          },
        ],
        defects: [
          { id: 'def-1', status: 'OPEN' },
        ],
      },
    ];

    vi.mocked(prisma.milestone.count).mockResolvedValue(1);
    vi.mocked(prisma.milestone.findMany).mockResolvedValue(mockMilestones as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    const item = res.body.data[0];
    expect(item.progress.totalRuns).toBe(1);
    expect(item.progress.passedRuns).toBe(2);
    expect(item.progress.failedRuns).toBe(1);
    // 3 total executed out of 3 cases = 100% execution
    expect(item.progress.completionPercentage).toBe(100);
    expect(item.progress.openDefects).toBe(1);
  });

  it('PATCH /api/v1/projects/:projectId/milestones/:milestoneId > updates status and auto-stamps completedAt', async () => {
    const existing = {
      id: 'mile-001',
      projectId,
      name: 'Release 1',
      status: MilestoneStatus.IN_PROGRESS,
      completedAt: null,
      startDate: new Date('2026-10-01'),
      dueDate: new Date('2026-11-15'),
    };

    vi.mocked(prisma.milestone.findFirst).mockResolvedValue(existing as any);
    vi.mocked(prisma.milestone.update).mockResolvedValue({
      ...existing,
      status: MilestoneStatus.COMPLETED,
      completedAt: new Date(),
      _count: { testPlans: 0, testRuns: 0, testCases: 0, defects: 0 },
    } as any);

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/milestones/mile-001`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: 'COMPLETED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('DELETE /api/v1/projects/:projectId/milestones/:milestoneId > enforces RBAC (VIEWER forbidden)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-viewer-456',
      email: 'viewer@example.com',
      firstName: 'Viewer',
      lastName: 'User',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-viewer',
      organizationId: orgId,
      userId: 'user-viewer-456',
      role: OrganizationRole.VIEWER,
    } as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/milestones/mile-001`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });
});
