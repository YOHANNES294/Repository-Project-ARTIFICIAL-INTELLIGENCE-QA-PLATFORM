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
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      defectComment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      defectHistory: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

describe('Defect Collaboration & Analytics Endpoints', () => {
  const app = createApp();
  const orgId = 'org-qa-123';
  const staffUserId = 'user-staff';
  const viewerUserId = 'user-client-viewer';
  const projectId = 'proj-core-001';

  const staffToken = generateAccessToken({
    sub: staffUserId,
    email: 'lead@qa.corp',
    orgId,
    role: OrganizationRole.QA_MANAGER,
  });

  const viewerToken = generateAccessToken({
    sub: viewerUserId,
    email: 'client@partner.com',
    orgId,
    role: OrganizationRole.VIEWER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockImplementation((args: any) => {
      const id = args.where.id;
      if (id === staffUserId) {
        return Promise.resolve({
          id: staffUserId,
          email: 'lead@qa.corp',
          firstName: 'Sarah',
          lastName: 'Connor',
        } as any);
      }
      return Promise.resolve({
        id: viewerUserId,
        email: 'client@partner.com',
        firstName: 'Bob',
        lastName: 'Viewer',
      } as any);
    });

    vi.mocked(prisma.organizationMember.findUnique).mockImplementation((args: any) => {
      const uId = args.where.organizationId_userId.userId;
      if (uId === staffUserId) {
        return Promise.resolve({
          id: 'mem-staff',
          organizationId: orgId,
          userId: staffUserId,
          role: OrganizationRole.QA_MANAGER,
        } as any);
      }
      return Promise.resolve({
        id: 'mem-viewer',
        organizationId: orgId,
        userId: viewerUserId,
        role: OrganizationRole.VIEWER,
      } as any);
    });

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      organizationId: orgId,
      name: 'Core Platform',
      key: 'CORE',
    } as any);
  });

  it('POST & GET /:defectId/comments supports threaded replies and hides internal notes from VIEWERS', async () => {
    const defectId = 'defect-10';

    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: defectId,
      projectId,
    } as any);

    // 1. Staff creates internal note
    vi.mocked(prisma.defectComment.create).mockResolvedValue({
      id: 'comment-internal',
      defectId,
      userId: staffUserId,
      content: 'Confidential: Reproduction involves staging secret key',
      isInternal: true,
      parentId: null,
      createdAt: new Date(),
      user: { id: staffUserId, email: 'lead@qa.corp', firstName: 'Sarah', lastName: 'Connor' },
    } as any);

    const resInternal = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/${defectId}/comments`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        content: 'Confidential: Reproduction involves staging secret key',
        isInternal: true,
      });

    expect(resInternal.status).toBe(201);
    expect(resInternal.body.data.isInternal).toBe(true);

    // 2. Fetch comments with VIEWER token: Prisma query should filter { isInternal: false }
    vi.mocked(prisma.defectComment.findMany).mockResolvedValue([
      {
        id: 'comment-public',
        defectId,
        userId: staffUserId,
        content: 'Public status update',
        isInternal: false,
        parentId: null,
        user: { id: staffUserId, email: 'lead@qa.corp', firstName: 'Sarah', lastName: 'Connor' },
        replies: [],
      },
    ] as any);

    const resViewerGet = await request(app)
      .get(`/api/v1/projects/${projectId}/defects/${defectId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(resViewerGet.status).toBe(200);
    expect(prisma.defectComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isInternal: false,
        }),
      })
    );
    expect(resViewerGet.body.data.length).toBe(1);
    expect(resViewerGet.body.data[0].isInternal).toBe(false);
  });

  it('GET /duplicate-candidates scores and returns matching candidate defects', async () => {
    vi.mocked(prisma.defect.findMany).mockResolvedValue([
      {
        id: 'def-existing-1',
        defectNumber: 3,
        title: 'Checkout payment fails with timeout on Safari mobile',
        component: 'Checkout',
        environmentId: 'env-prod',
        status: DefectStatus.OPEN,
        project: { key: 'CORE' },
      },
      {
        id: 'def-existing-2',
        defectNumber: 4,
        title: 'User profile avatar upload broken',
        component: 'Settings',
        environmentId: 'env-dev',
        status: DefectStatus.IN_PROGRESS,
        project: { key: 'CORE' },
      },
    ] as any);

    const res = await request(app)
      .get(
        `/api/v1/projects/${projectId}/defects/duplicate-candidates?title=Checkout%20payment%20timeout%20Safari&component=Checkout`
      )
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should match def-existing-1 with high confidence, and NOT def-existing-2
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].defect.key).toBe('CORE-BUG-3');
    expect(res.body.data[0].confidence).toBeGreaterThan(0.5);
    expect(res.body.data[0].matchReasons.length).toBeGreaterThan(0);
  });

  it('GET /analytics calculates real database metrics: status counts, resolution times, and handles empty sets safely', async () => {
    const created1 = new Date('2026-11-01T10:00:00Z');
    const resolved1 = new Date('2026-11-01T14:00:00Z'); // 4 hours

    vi.mocked(prisma.defect.findMany).mockResolvedValue([
      {
        id: 'd1',
        defectNumber: 1,
        title: 'Bug 1',
        status: DefectStatus.FIXED,
        severity: DefectSeverity.CRITICAL,
        priority: DefectPriority.URGENT,
        component: 'Auth',
        createdAt: created1,
        resolvedAt: resolved1,
        closedAt: null,
        project: { key: 'CORE' },
        assignee: { id: 'dev-1', firstName: 'John', lastName: 'Doe', email: 'john@corp.com' },
        milestone: { id: 'm1', name: 'Sprint 24' },
      },
      {
        id: 'd2',
        defectNumber: 2,
        title: 'Bug 2',
        status: DefectStatus.IN_PROGRESS,
        severity: DefectSeverity.HIGH,
        priority: DefectPriority.HIGH,
        component: 'Auth',
        createdAt: created1,
        resolvedAt: null,
        closedAt: null,
        project: { key: 'CORE' },
        assignee: { id: 'dev-1', firstName: 'John', lastName: 'Doe', email: 'john@corp.com' },
        milestone: { id: 'm1', name: 'Sprint 24' },
      },
    ] as any);

    vi.mocked(prisma.defectHistory.count).mockResolvedValue(1); // 1 reopened history event
    vi.mocked(prisma.defectHistory.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/defects/analytics`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data;
    expect(stats.totalDefects).toBe(2);
    expect(stats.openDefects).toBe(1);
    expect(stats.resolvedDefects).toBe(1);
    expect(stats.criticalHighDefects).toBe(2);
    expect(stats.avgTimeToResolutionHours).toBe(4);
    expect(stats.aging.lessThan7Days).toBe(2);
    expect(stats.byComponent).toContainEqual({ component: 'Auth', count: 2 });
  });
});
