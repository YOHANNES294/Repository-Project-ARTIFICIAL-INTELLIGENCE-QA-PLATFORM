import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import {
  OrganizationRole,
  TestPriority,
  TestType,
  TestCaseStatus,
} from '@ai-qa/shared-types';

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
      },
      milestone: {
        findFirst: vi.fn(),
      },
      tag: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      testCase: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      testCaseVersion: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      testStep: {
        createMany: vi.fn(),
      },
      testRunCase: {
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('Test Case Management & Versioning (/api/v1/projects/:projectId/test-cases)', () => {
  const app = createApp();
  const orgId = 'org-test-123';
  const userId = 'user-qa-123';
  const projectId = 'proj-qa-001';

  const engineerToken = generateAccessToken({
    sub: userId,
    email: 'qa@example.com',
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
      email: 'qa@example.com',
      firstName: 'Alice',
      lastName: 'QA',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-qa',
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

  it('POST /api/v1/projects/:projectId/test-cases > creates test case and initial version with steps', async () => {
    const rawInput = {
      title: 'Verify User Login with Valid Credentials',
      description: 'Ensure user can authenticate with valid email and password',
      preconditions: 'User registered and email verified',
      objectives: 'Verify 200 OK and JWT cookie setting',
      priority: 'HIGH',
      type: 'SMOKE',
      status: 'ACTIVE',
      estimatedTimeMin: 5,
      tags: ['auth', 'smoke'],
      steps: [
        {
          stepNumber: 1,
          action: 'Navigate to login page',
          testData: '/login',
          expectedResult: 'Login form is displayed with email and password fields',
        },
        {
          stepNumber: 2,
          action: 'Enter valid credentials and submit form',
          testData: 'test@example.com / Password123!',
          expectedResult: 'User authenticated and redirected to dashboard',
        },
      ],
    };

    vi.mocked(prisma.tag.upsert)
      .mockResolvedValueOnce({ id: 'tag-1', name: 'auth', projectId, color: '#3B82F6', createdAt: new Date() } as any)
      .mockResolvedValueOnce({ id: 'tag-2', name: 'smoke', projectId, color: '#3B82F6', createdAt: new Date() } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        testCase: {
          findFirst: vi.fn().mockResolvedValue(null), // nextCaseNumber = 1
          create: vi.fn().mockResolvedValue({
            id: 'tc-001',
            projectId,
            caseNumber: 1,
            title: rawInput.title,
            priority: TestPriority.HIGH,
            type: TestType.SMOKE,
            status: TestCaseStatus.ACTIVE,
          }),
        },
        testCaseVersion: {
          create: vi.fn().mockResolvedValue({
            id: 'ver-001',
            testCaseId: 'tc-001',
            versionNumber: 1,
          }),
        },
        testStep: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return callback(tx);
    });

    vi.mocked(prisma.testCase.findFirst).mockResolvedValue({
      id: 'tc-001',
      projectId,
      suiteId: null,
      milestoneId: null,
      caseNumber: 1,
      title: rawInput.title,
      description: rawInput.description,
      preconditions: rawInput.preconditions,
      objectives: rawInput.objectives,
      priority: TestPriority.HIGH,
      type: TestType.SMOKE,
      status: TestCaseStatus.ACTIVE,
      estimatedTimeMin: 5,
      isArchived: false,
      currentVersion: 1,
      authorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      suite: null,
      milestone: null,
      author: { id: userId, email: 'qa@example.com', firstName: 'Alice', lastName: 'QA' },
      tags: [
        { id: 'tag-1', projectId, name: 'auth', color: '#3B82F6', createdAt: new Date() },
        { id: 'tag-2', projectId, name: 'smoke', color: '#3B82F6', createdAt: new Date() },
      ],
      versions: [
        {
          id: 'ver-001',
          testCaseId: 'tc-001',
          versionNumber: 1,
          title: rawInput.title,
          description: rawInput.description,
          preconditions: rawInput.preconditions,
          objectives: rawInput.objectives,
          priority: TestPriority.HIGH,
          type: TestType.SMOKE,
          status: TestCaseStatus.ACTIVE,
          changeSummary: 'Initial test case creation',
          createdById: userId,
          createdAt: new Date(),
          steps: [
            { id: 's-1', testCaseVersionId: 'ver-001', stepNumber: 1, action: 'Navigate to login', testData: '/login', expectedResult: 'Login form shown' },
            { id: 's-2', testCaseVersionId: 'ver-001', stepNumber: 2, action: 'Submit valid form', testData: 'email/pass', expectedResult: 'Redirect to dashboard' },
          ],
        },
      ],
    } as any);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-cases`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(rawInput);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.key).toBe('CORE-1');
    expect(res.body.data.currentVersion).toBe(1);
    expect(res.body.data.currentVersionDetails.steps).toHaveLength(2);
  });

  it('PATCH /api/v1/projects/:projectId/test-cases/:caseId > creates new immutable version snapshot on step changes', async () => {
    const existing = {
      id: 'tc-001',
      projectId,
      caseNumber: 1,
      title: 'Login Test',
      description: 'Desc',
      preconditions: 'None',
      objectives: 'Obj',
      priority: TestPriority.MEDIUM,
      type: TestType.FUNCTIONAL,
      status: TestCaseStatus.ACTIVE,
      currentVersion: 1,
      tags: [],
      versions: [
        {
          versionNumber: 1,
          steps: [
            { stepNumber: 1, action: 'Step 1 old', testData: null, expectedResult: 'Res 1 old' },
          ],
        },
      ],
    };

    vi.mocked(prisma.testCase.findFirst)
      .mockResolvedValueOnce(existing as any) // in updateTestCase check
      .mockResolvedValueOnce({
        ...existing,
        currentVersion: 2,
        title: 'Login Test Updated',
        versions: [
          {
            versionNumber: 2,
            title: 'Login Test Updated',
            steps: [
              { id: 's-1', testCaseVersionId: 'ver-2', stepNumber: 1, action: 'Step 1 updated action', testData: null, expectedResult: 'Res 1 updated' },
            ],
          },
        ],
      } as any); // in getTestCaseById fetch

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        testCaseVersion: {
          create: vi.fn().mockResolvedValue({ id: 'ver-2', versionNumber: 2 }),
        },
        testStep: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        testCase: {
          update: vi.fn().mockResolvedValue({ id: 'tc-001', currentVersion: 2 }),
        },
      };
      return callback(tx);
    });

    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}/test-cases/tc-001`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        title: 'Login Test Updated',
        steps: [
          {
            stepNumber: 1,
            action: 'Step 1 updated action',
            expectedResult: 'Res 1 updated',
          },
        ],
        changeSummary: 'Updated step 1 action description',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentVersion).toBe(2);
  });

  it('GET /api/v1/projects/:projectId/test-cases/:caseId/versions/compare > diffs two versions', async () => {
    vi.mocked(prisma.testCaseVersion.findFirst)
      .mockResolvedValueOnce({
        id: 'ver-1',
        testCaseId: 'tc-001',
        versionNumber: 1,
        title: 'Initial Title',
        description: null,
        preconditions: null,
        objectives: null,
        priority: TestPriority.MEDIUM,
        type: TestType.FUNCTIONAL,
        status: TestCaseStatus.ACTIVE,
        changeSummary: 'Initial',
        createdById: userId,
        createdAt: new Date(),
        steps: [{ id: 's1', testCaseVersionId: 'ver-1', stepNumber: 1, action: 'Action A', testData: null, expectedResult: 'Res A' }],
      } as any)
      .mockResolvedValueOnce({
        id: 'ver-2',
        testCaseId: 'tc-001',
        versionNumber: 2,
        title: 'Updated Title',
        description: null,
        preconditions: null,
        objectives: null,
        priority: TestPriority.HIGH,
        type: TestType.FUNCTIONAL,
        status: TestCaseStatus.ACTIVE,
        changeSummary: 'Updated',
        createdById: userId,
        createdAt: new Date(),
        steps: [{ id: 's2', testCaseVersionId: 'ver-2', stepNumber: 1, action: 'Action B', testData: null, expectedResult: 'Res B' }],
      } as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/test-cases/tc-001/versions/compare?v1=1&v2=2`)
      .set('Authorization', `Bearer ${engineerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.titleChanged).toBe(true);
    expect(res.body.data.priorityChanged).toBe(true);
    expect(res.body.data.stepsChanged).toBe(true);
  });

  it('DELETE /api/v1/projects/:projectId/test-cases/:caseId > prevents deletion if executed in test runs', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-mgr-789',
      email: 'manager@example.com',
      firstName: 'Manager',
      lastName: 'QA',
      isSuperAdmin: false,
    } as any);

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-mgr',
      organizationId: orgId,
      userId: 'user-mgr-789',
      role: OrganizationRole.QA_MANAGER,
    } as any);

    vi.mocked(prisma.testCase.findFirst).mockResolvedValue({
      id: 'tc-executed',
      projectId,
      caseNumber: 5,
      title: 'Executed Case',
    } as any);

    // Mock that this case has execution records
    vi.mocked(prisma.testRunCase.findFirst).mockResolvedValue({
      id: 'trc-1',
      testRunId: 'tr-1',
    } as any);

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/test-cases/tc-executed`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/historical QA audit logs/i);
  });
});
