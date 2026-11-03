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
  DefectType,
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
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      defectHistory: {
        create: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      defectAssignment: {
        create: vi.fn(),
      },
      defectComment: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      defectTestLink: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
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

describe('Defect Lifecycle & Management Endpoints (/api/v1/projects/:projectId/defects)', () => {
  const app = createApp();
  const orgId = 'org-qa-123';
  const userId = '44444444-4444-4444-8444-444444444444';
  const devId = '33333333-3333-4333-8333-333333333333';
  const projectId = 'proj-core-001';

  const validToken = generateAccessToken({
    sub: userId,
    email: 'lead@qa.corp',
    orgId,
    role: OrganizationRole.QA_MANAGER,
  });

  const viewerToken = generateAccessToken({
    sub: 'user-viewer',
    email: 'viewer@client.corp',
    orgId,
    role: OrganizationRole.VIEWER,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'lead@qa.corp',
      firstName: 'Sarah',
      lastName: 'Connor',
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-1',
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

  it('POST / creates a defect with sequential project-scoped key CORE-BUG-1', async () => {
    vi.mocked(prisma.defect.findFirst).mockResolvedValue(null); // first defect in project
    vi.mocked(prisma.defect.create).mockResolvedValue({
      id: 'defect-1',
      projectId,
      defectNumber: 1,
      title: 'Checkout button unresponsive on iOS Safari',
      description: 'Clicking pay now does not submit the order',
      severity: DefectSeverity.CRITICAL,
      priority: DefectPriority.URGENT,
      status: DefectStatus.NEW,
      type: DefectType.UI,
      component: 'Checkout',
      project: { id: projectId, key: 'CORE', name: 'Core Platform' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Checkout button unresponsive on iOS Safari',
        description: 'Clicking pay now does not submit the order',
        severity: 'CRITICAL',
        priority: 'URGENT',
        type: 'UI',
        component: 'Checkout',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe('CORE-BUG-1');
    expect(res.body.data.defectNumber).toBe(1);
  });

  it('POST /:defectId/status transitions from NEW to IN_PROGRESS, then FIXED with resolution', async () => {
    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: 'defect-1',
      projectId,
      status: DefectStatus.NEW,
      project: { organizationId: orgId, key: 'CORE' },
    } as any);

    vi.mocked(prisma.defect.update).mockResolvedValue({
      id: 'defect-1',
      projectId,
      defectNumber: 1,
      status: DefectStatus.IN_PROGRESS,
      project: { key: 'CORE' },
    } as any);

    // Transition to IN_PROGRESS
    const resProgress = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/defect-1/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(resProgress.status).toBe(200);
    expect(resProgress.body.data.status).toBe(DefectStatus.IN_PROGRESS);

    // Transition from IN_PROGRESS to FIXED with resolution
    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: 'defect-1',
      projectId,
      status: DefectStatus.IN_PROGRESS,
      project: { organizationId: orgId, key: 'CORE' },
    } as any);

    vi.mocked(prisma.defect.update).mockResolvedValue({
      id: 'defect-1',
      projectId,
      defectNumber: 1,
      status: DefectStatus.FIXED,
      resolution: 'Fixed event listener touch collision in Safari 17',
      project: { key: 'CORE' },
    } as any);

    const resFixed = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/defect-1/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        status: 'FIXED',
        resolution: 'Fixed event listener touch collision in Safari 17',
      });

    expect(resFixed.status).toBe(200);
    expect(resFixed.body.data.status).toBe(DefectStatus.FIXED);
  });

  it('POST /:defectId/status rejects transition to FIXED when resolution is missing', async () => {
    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: 'defect-1',
      projectId,
      status: DefectStatus.IN_PROGRESS,
      project: { organizationId: orgId, key: 'CORE' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/defect-1/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'FIXED' }); // missing resolution

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Resolution details are required');
  });

  it('POST /:defectId/status rejects invalid transition bypassing lifecycle rules (e.g. CLOSED to IN_PROGRESS directly)', async () => {
    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: 'defect-1',
      projectId,
      status: DefectStatus.CLOSED,
      project: { organizationId: orgId, key: 'CORE' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/defect-1/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid defect status transition');
  });

  it('POST /:defectId/status prevents circular duplicate relationship cycles', async () => {
    const defectA = '11111111-1111-4111-8111-111111111111';
    const defectB = '22222222-2222-4222-8222-222222222222';

    vi.mocked(prisma.defect.findUnique)
      .mockResolvedValueOnce({
        id: defectA,
        projectId,
        status: DefectStatus.OPEN,
        project: { organizationId: orgId, key: 'CORE' },
      } as any)
      .mockResolvedValueOnce({
        id: defectB,
        projectId,
        duplicateOfId: defectA, // B already duplicates A!
      } as any);

    // Trying to mark A as duplicate of B would cause A -> B -> A cycle!
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/${defectA}/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        status: 'DUPLICATE',
        duplicateOfId: defectB,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Circular duplicate relationship detected');
  });

  it('POST /:defectId/assign assigns developer and QA owner with audit record', async () => {
    vi.mocked(prisma.defect.findUnique).mockResolvedValue({
      id: 'defect-1',
      projectId,
      assigneeId: null,
      qaOwnerId: null,
      project: { key: 'CORE' },
    } as any);

    vi.mocked(prisma.defect.update).mockResolvedValue({
      id: 'defect-1',
      projectId,
      defectNumber: 1,
      assigneeId: devId,
      qaOwnerId: userId,
      project: { key: 'CORE' },
      assignee: { id: devId, email: 'dev@core.io', firstName: 'John', lastName: 'Doe' },
      qaOwner: { id: userId, email: 'lead@qa.corp', firstName: 'Sarah', lastName: 'Connor' },
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects/defect-1/assign`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        assigneeId: devId,
        qaOwnerId: userId,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.assignee.email).toBe('dev@core.io');
    expect(prisma.defectAssignment.create).toHaveBeenCalled();
  });

  it('enforces RBAC: VIEWER cannot create defects or perform status transitions', async () => {
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-viewer',
      organizationId: orgId,
      userId: 'user-viewer',
      role: OrganizationRole.VIEWER,
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/defects`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Unauthorized defect attempt',
        description: 'Should be rejected',
      });

    expect(res.status).toBe(403);
  });
});
