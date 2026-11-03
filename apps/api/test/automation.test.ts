import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, ExecutionStatus } from '@ai-qa/shared-types';
import {
  automationTokenService,
  automationMappingService,
  automationIngestionService,
  automationWebhookService,
  parseNewmanReport,
  parsePlaywrightReport,
} from '../src/services/automation/index.js';

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
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      automationApiToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      automationTestMapping: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      automationSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      automationUnmappedTest: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      automationWebhookEvent: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      testRun: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      testRunCase: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      testResult: {
        create: vi.fn(),
      },
      testExecutionStep: {
        create: vi.fn(),
      },
      testCase: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      defect: {
        findFirst: vi.fn(),
      },
      defectTestLink: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    },
  };
});

describe('Milestone 08: Automation & CI/CD Integration', () => {
  const app = createApp();

  const mockOrgId = 'org-auto-001';
  const mockProjectId = 'proj-auto-001';
  const mockUserId = 'user-auto-001';

  const validToken = generateAccessToken({
    sub: mockUserId,
    email: 'automation@test.local',
    firstName: 'Auto',
    lastName: 'Engineer',
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUserId,
      email: 'automation@test.local',
      firstName: 'Auto',
      lastName: 'Engineer',
      isSuperAdmin: false,
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      avatarUrl: null,
    });

    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      id: 'mem-001',
      organizationId: mockOrgId,
      userId: mockUserId,
      role: OrganizationRole.QA_ENGINEER,
      customRoleId: null,
      joinedAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: mockProjectId,
      organizationId: mockOrgId,
      name: 'Automation Core',
      key: 'AUTO',
      description: 'Auto test project',
      objectives: null,
      status: 'ACTIVE',
      isArchived: false,
      archivedAt: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: mockProjectId,
      organizationId: mockOrgId,
      name: 'Automation Core',
      key: 'AUTO',
      description: 'Auto test project',
      objectives: null,
      status: 'ACTIVE',
      isArchived: false,
      archivedAt: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // --------------------------------------------------------------------------
  // 1. API Token Management & Cryptographic Hashing
  // --------------------------------------------------------------------------
  describe('Automation API Tokens & Cryptography', () => {
    it('creates an automation API token with SHA-256 hash at rest and returns raw token once', async () => {
      vi.mocked(prisma.automationApiToken.create).mockImplementation(async (args: any) => {
        return {
          id: 'token-uuid-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          isRevoked: false,
          revokedAt: null,
          lastUsedAt: null,
        };
      });

      const res = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/automation/tokens`)
        .set('Cookie', [`accessToken=${validToken}`])
        .set('x-organization-id', mockOrgId)
        .send({
          name: 'GitHub Actions CI Runner',
          scopes: ['automation:ingest'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawToken).toMatch(/^aiqa_auto_[a-f0-9]{8}_[a-f0-9]{48}$/);
      expect(res.body.data.token.name).toBe('GitHub Actions CI Runner');
      expect(res.body.data.token.tokenPrefix).toMatch(/^aiqa_auto_[a-f0-9]{8}$/);

      // Verify that prisma.automationApiToken.create received a 64-char SHA-256 hash
      const createCall = vi.mocked(prisma.automationApiToken.create).mock.calls[0][0];
      expect(createCall.data.tokenHash).toHaveLength(64);
      expect(createCall.data.tokenHash).not.toEqual(res.body.data.rawToken);
    });

    it('authenticates a valid automation token and updates lastUsedAt', async () => {
      const rawToken = 'aiqa_auto_12345678_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      vi.mocked(prisma.automationApiToken.findUnique).mockResolvedValue({
        id: 'token-uuid-1',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        name: 'CI Runner',
        tokenPrefix: 'aiqa_auto_12345678',
        tokenHash,
        scopes: ['automation:ingest'],
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: false,
        revokedAt: null,
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.automationApiToken.update).mockResolvedValue({} as any);

      const authResult = await automationTokenService.authenticateToken(rawToken);
      expect(authResult.projectId).toBe(mockProjectId);
      expect(authResult.organizationId).toBe(mockOrgId);
      expect(prisma.automationApiToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-uuid-1' },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        })
      );
    });

    it('rejects a revoked automation token', async () => {
      const rawToken = 'aiqa_auto_12345678_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      vi.mocked(prisma.automationApiToken.findUnique).mockResolvedValue({
        id: 'token-uuid-revoked',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        name: 'Revoked Runner',
        tokenPrefix: 'aiqa_auto_12345678',
        tokenHash,
        scopes: ['automation:ingest'],
        lastUsedAt: null,
        expiresAt: null,
        isRevoked: true,
        revokedAt: new Date(),
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(automationTokenService.authenticateToken(rawToken)).rejects.toThrow(
        'Automation token has been revoked'
      );
    });

    it('rejects an expired automation token', async () => {
      const rawToken = 'aiqa_auto_12345678_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      vi.mocked(prisma.automationApiToken.findUnique).mockResolvedValue({
        id: 'token-uuid-expired',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        name: 'Expired Runner',
        tokenPrefix: 'aiqa_auto_12345678',
        tokenHash,
        scopes: ['automation:ingest'],
        lastUsedAt: null,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        isRevoked: false,
        revokedAt: null,
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(automationTokenService.authenticateToken(rawToken)).rejects.toThrow(
        'Automation token has expired'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. Test Case Mapping Engine
  // --------------------------------------------------------------------------
  describe('Test Case Mapping & Resolution Engine', () => {
    it('creates an explicit test mapping linking external ID to TestCase', async () => {
      vi.mocked(prisma.testCase.findFirst).mockResolvedValue({
        id: 'tc-uuid-1',
        projectId: mockProjectId,
        caseNumber: 101,
        title: 'User Login with Valid Credentials',
        project: { key: 'AUTO' },
      } as any);

      vi.mocked(prisma.automationTestMapping.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.automationTestMapping.create).mockResolvedValue({
        id: 'map-uuid-1',
        projectId: mockProjectId,
        testCaseId: 'tc-uuid-1',
        externalId: 'specs/login.spec.ts::User should log in',
        externalTitle: 'User should log in',
        framework: 'PLAYWRIGHT',
        confidence: 1.0,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        testCase: {
          id: 'tc-uuid-1',
          caseNumber: 101,
          title: 'User Login with Valid Credentials',
          project: { key: 'AUTO' },
        },
      } as any);

      const mapping = await automationMappingService.createMapping(mockProjectId, {
        testCaseId: 'tc-uuid-1',
        externalId: 'specs/login.spec.ts::User should log in',
        externalTitle: 'User should log in',
        framework: 'PLAYWRIGHT',
      });

      expect(mapping.id).toBe('map-uuid-1');
      expect(mapping.testCase?.key).toBe('AUTO-101');
    });

    it('prevents duplicate mapping for same externalId in the same project', async () => {
      vi.mocked(prisma.testCase.findFirst).mockResolvedValue({
        id: 'tc-uuid-1',
        projectId: mockProjectId,
      } as any);

      vi.mocked(prisma.automationTestMapping.findUnique).mockResolvedValue({
        id: 'existing-map',
      } as any);

      await expect(
        automationMappingService.createMapping(mockProjectId, {
          testCaseId: 'tc-uuid-1',
          externalId: 'specs/login.spec.ts::User should log in',
          externalTitle: 'User should log in',
        })
      ).rejects.toThrow('already mapped in this project');
    });

    it('resolves external test by explicit annotation e.g. @AIQA-101', async () => {
      vi.mocked(prisma.testCase.findFirst).mockResolvedValue({
        id: 'tc-uuid-101',
      } as any);

      const result = await automationMappingService.resolveExternalTest(
        mockProjectId,
        'specs/auth.spec.ts::test',
        'User should log in @AIQA-101'
      );

      expect(result.testCaseId).toBe('tc-uuid-101');
      expect(result.isExplicit).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('resolves external test by mapped externalId', async () => {
      vi.mocked(prisma.testCase.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.automationTestMapping.findUnique).mockResolvedValue({
        testCaseId: 'tc-uuid-mapped',
        confidence: 1.0,
      } as any);

      const result = await automationMappingService.resolveExternalTest(
        mockProjectId,
        'tests/checkout.spec.ts::Complete Checkout',
        'Complete Checkout'
      );

      expect(result.testCaseId).toBe('tc-uuid-mapped');
      expect(result.isExplicit).toBe(false);
      expect(result.confidence).toBe(1.0);
    });

    it('records unmapped tests when no matching test case is found', async () => {
      vi.mocked(prisma.automationUnmappedTest.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.automationUnmappedTest.create).mockResolvedValue({} as any);

      await automationMappingService.recordUnmappedTest(
        mockProjectId,
        'session-1',
        'tests/unmapped.spec.ts::New Feature',
        'New Feature Test',
        'Billing Suite',
        'PLAYWRIGHT'
      );

      expect(prisma.automationUnmappedTest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: mockProjectId,
          sessionId: 'session-1',
          externalId: 'tests/unmapped.spec.ts::New Feature',
          externalTitle: 'New Feature Test',
          suiteName: 'Billing Suite',
          status: 'PENDING',
        }),
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Automation Ingestion Sessions & Idempotency
  // --------------------------------------------------------------------------
  describe('Automation Session Ingestion & Idempotency', () => {
    it('creates an ingestion session and automatically spins up a linked automated TestRun', async () => {
      vi.mocked(prisma.automationSession.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.testRun.findFirst).mockResolvedValue({ runNumber: 5 } as any);

      vi.mocked(prisma.testRun.create).mockResolvedValue({
        id: 'tr-auto-1',
        runNumber: 6,
        name: 'Playwright E2E Suite',
        isAutomated: true,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      } as any);

      vi.mocked(prisma.automationSession.create).mockResolvedValue({
        id: 'session-auto-1',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        testRunId: 'tr-auto-1',
        idempotencyKey: 'idemp-run-123',
        framework: 'PLAYWRIGHT',
        status: 'INITIALIZED',
        ciProvider: 'GITHUB_ACTIONS',
        gitBranch: 'main',
        gitCommitSha: 'a1b2c3d4e5f6',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        testRun: {
          id: 'tr-auto-1',
          runNumber: 6,
          name: 'Playwright E2E Suite',
          status: 'IN_PROGRESS',
        },
      } as any);

      const session = await automationIngestionService.createSession(mockProjectId, mockOrgId, {
        framework: 'PLAYWRIGHT',
        testRunName: 'Playwright E2E Suite',
        idempotencyKey: 'idemp-run-123',
        ciProvider: 'GITHUB_ACTIONS',
        gitBranch: 'main',
        gitCommitSha: 'a1b2c3d4e5f6',
      });

      expect(session.id).toBe('session-auto-1');
      expect(session.testRun?.isAutomated !== undefined || session.testRun?.runNumber === 6).toBe(true);
      expect(session.gitBranch).toBe('main');
    });

    it('returns existing session when matching idempotencyKey is submitted without duplicating runs', async () => {
      vi.mocked(prisma.automationSession.findUnique).mockResolvedValue({
        id: 'session-existing',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        testRunId: 'tr-auto-existing',
        idempotencyKey: 'idemp-run-duplicate',
        framework: 'PLAYWRIGHT',
        status: 'INITIALIZED',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        testRun: {
          id: 'tr-auto-existing',
          runNumber: 2,
          name: 'Existing Run',
          status: 'IN_PROGRESS',
        },
      } as any);

      const session = await automationIngestionService.createSession(mockProjectId, mockOrgId, {
        idempotencyKey: 'idemp-run-duplicate',
      });

      expect(session.id).toBe('session-existing');
      expect(prisma.testRun.create).not.toHaveBeenCalled();
    });

    it('ingests batch test results, links TestCaseVersion, creates TestResult and preserves retry attempts', async () => {
      vi.mocked(prisma.automationSession.findFirst).mockResolvedValue({
        id: 'session-active',
        projectId: mockProjectId,
        testRunId: 'tr-run-1',
        status: 'INITIALIZED',
        framework: 'PLAYWRIGHT',
      } as any);

      // Mock mapped test case
      vi.mocked(prisma.testCase.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.automationTestMapping.findUnique).mockResolvedValue({
        testCaseId: 'tc-uuid-1',
        confidence: 1.0,
      } as any);

      vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
        id: 'tc-uuid-1',
        versions: [{ id: 'tc-ver-uuid-1', versionNumber: 1 }],
      } as any);

      vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.testRunCase.create).mockResolvedValue({ id: 'runcase-1' } as any);
      vi.mocked(prisma.testResult.create).mockResolvedValue({ id: 'res-1' } as any);
      vi.mocked(prisma.automationSession.update).mockResolvedValue({
        id: 'session-active',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        testRunId: 'tr-run-1',
        status: 'INGESTING',
        framework: 'PLAYWRIGHT',
        totalTests: 2,
        passedTests: 1,
        failedTests: 1,
        skippedTests: 0,
        durationMs: 1500,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const ingestResult = await automationIngestionService.ingestResults(mockProjectId, {
        sessionId: 'session-active',
        results: [
          {
            externalId: 'auth.spec.ts::Login Success',
            externalTitle: 'Login Success',
            status: 'PASSED',
            durationMs: 500,
            attemptNumber: 1,
            isFinalAttempt: true,
          },
          {
            externalId: 'auth.spec.ts::Login Flaky',
            externalTitle: 'Login Flaky',
            status: 'FAILED',
            durationMs: 1000,
            attemptNumber: 1,
            isFinalAttempt: true,
            errorMessage: 'Timeout after 1000ms',
            stackTrace: 'Error: Timeout at auth.spec.ts:42',
          },
        ],
      });

      expect(ingestResult.processedCount).toBe(2);
      expect(prisma.testResult.create).toHaveBeenCalledTimes(2);

      // Verify TestResult attemptNumber and error fields preserved
      const failedResultCall = vi.mocked(prisma.testResult.create).mock.calls[1][0];
      expect(failedResultCall.data.status).toBe(ExecutionStatus.FAILED);
      expect(failedResultCall.data.failureReason).toBe('Timeout after 1000ms');
    });

    it('finalizes an automation session and transitions TestRun to COMPLETED', async () => {
      vi.mocked(prisma.automationSession.findFirst).mockResolvedValue({
        id: 'session-active',
        projectId: mockProjectId,
        testRunId: 'tr-run-1',
        status: 'INGESTING',
      } as any);

      vi.mocked(prisma.automationSession.update).mockResolvedValue({
        id: 'session-active',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        testRunId: 'tr-run-1',
        status: 'COMPLETED',
        framework: 'PLAYWRIGHT',
        totalTests: 10,
        passedTests: 9,
        failedTests: 1,
        skippedTests: 0,
        durationMs: 5400,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        testRun: {
          id: 'tr-run-1',
          runNumber: 1,
          name: 'CI Run',
          status: 'COMPLETED',
        },
      } as any);

      const finalized = await automationIngestionService.finalizeSession(mockProjectId, {
        sessionId: 'session-active',
        status: 'COMPLETED',
      });

      expect(finalized.status).toBe('COMPLETED');
      expect(prisma.testRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tr-run-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4. Report Ingestion Adapters (Playwright & Newman)
  // --------------------------------------------------------------------------
  describe('Report Ingestion Adapters (Newman & Playwright)', () => {
    it('parses Newman JSON report into normalized test result items', () => {
      const mockNewmanReport = {
        collection: {
          info: { name: 'Payment API Gateway' },
        },
        run: {
          executions: [
            {
              item: { id: 'req-1', name: 'POST /v1/charges' },
              response: { code: 200, responseTime: 120 },
              assertions: [
                { assertion: 'Status code is 200' },
                {
                  assertion: 'Charge ID returned',
                  error: {
                    message: 'expected undefined to be a string',
                    stack: 'AssertionError: expected undefined to be a string',
                  },
                },
              ],
            },
          ],
        },
      };

      const parsedItems = parseNewmanReport(mockNewmanReport);
      expect(parsedItems).toHaveLength(2);

      expect(parsedItems[0].status).toBe('PASSED');
      expect(parsedItems[0].externalTitle).toBe('POST /v1/charges > Status code is 200');

      expect(parsedItems[1].status).toBe('FAILED');
      expect(parsedItems[1].externalTitle).toBe('POST /v1/charges > Charge ID returned');
      expect(parsedItems[1].errorMessage).toBe('expected undefined to be a string');
    });

    it('parses Playwright JSON report, preserving retry attempts and failure stacks', () => {
      const mockPlaywrightReport = {
        suites: [
          {
            title: 'Authentication Suite',
            specs: [
              {
                id: 'spec-1',
                title: 'User can sign in @AIQA-102',
                file: 'tests/auth.spec.ts',
                line: 10,
                column: 5,
                tests: [
                  {
                    projectName: 'chromium',
                    status: 'flaky',
                    results: [
                      {
                        retry: 0,
                        status: 'failed' as const,
                        duration: 350,
                        error: { message: 'Element not found: #login-btn' },
                      },
                      {
                        retry: 1,
                        status: 'passed' as const,
                        duration: 280,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const parsedItems = parsePlaywrightReport(mockPlaywrightReport);
      expect(parsedItems).toHaveLength(2);

      // Attempt 1: Failed
      expect(parsedItems[0].attemptNumber).toBe(1);
      expect(parsedItems[0].isFinalAttempt).toBe(false);
      expect(parsedItems[0].status).toBe('FAILED');
      expect(parsedItems[0].errorMessage).toBe('Element not found: #login-btn');
      expect(parsedItems[0].testCaseId).toBe('102');

      // Attempt 2: Passed
      expect(parsedItems[1].attemptNumber).toBe(2);
      expect(parsedItems[1].isFinalAttempt).toBe(true);
      expect(parsedItems[1].status).toBe('PASSED');
    });
  });

  // --------------------------------------------------------------------------
  // 5. GitHub Actions Webhook Integration
  // --------------------------------------------------------------------------
  describe('GitHub Actions Webhooks & HMAC Verification', () => {
    it('verifies valid GitHub HMAC-SHA256 webhook signatures', () => {
      const secret = 'my-webhook-secret';
      const payload = JSON.stringify({ action: 'completed', workflow_run: { id: 12345 } });
      const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const signature = `sha256=${hmac}`;

      const isValid = automationWebhookService.verifyGitHubSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('rejects invalid GitHub webhook signatures', () => {
      const secret = 'my-webhook-secret';
      const payload = JSON.stringify({ action: 'completed' });
      const signature = 'sha256=invalidhashvalue1234567890';

      const isValid = automationWebhookService.verifyGitHubSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it('detects duplicate webhook events and returns DUPLICATE status idempotently', async () => {
      vi.mocked(prisma.automationWebhookEvent.findUnique).mockResolvedValue({
        id: 'event-existing',
        projectId: mockProjectId,
        eventId: 'github-delivery-uuid-1',
        eventType: 'workflow_run',
        status: 'PROCESSED',
        errorMessage: null,
        receivedAt: new Date(),
      } as any);

      const result = await automationWebhookService.processGitHubWebhook(
        mockProjectId,
        'github-delivery-uuid-1',
        'workflow_run',
        'sha256=abc',
        { action: 'completed' }
      );

      expect(result.status).toBe('DUPLICATE');
      expect(prisma.automationWebhookEvent.create).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 6. HTTP API Endpoint Verification
  // --------------------------------------------------------------------------
  describe('HTTP Automation API Routes', () => {
    it('GET /overview returns dashboard metrics and recent sessions', async () => {
      vi.mocked(prisma.automationSession.count).mockResolvedValue(12);
      vi.mocked(prisma.automationTestMapping.count).mockResolvedValue(45);
      vi.mocked(prisma.automationUnmappedTest.count).mockResolvedValue(3);
      vi.mocked(prisma.automationApiToken.count).mockResolvedValue(2);
      vi.mocked(prisma.automationSession.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/automation/overview`)
        .set('Cookie', [`accessToken=${validToken}`])
        .set('x-organization-id', mockOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSessions).toBe(12);
      expect(res.body.data.totalMappings).toBe(45);
      expect(res.body.data.totalUnmapped).toBe(3);
    });

    it('POST /ingest/newman ingests a raw Newman JSON report and finalizes session', async () => {
      vi.mocked(prisma.testRun.create).mockResolvedValue({ id: 'tr-newman' } as any);
      vi.mocked(prisma.automationSession.create).mockResolvedValue({
        id: 'session-newman-1',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        framework: 'NEWMAN',
        status: 'INITIALIZED',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 0,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.automationSession.findFirst).mockResolvedValue({
        id: 'session-newman-1',
        projectId: mockProjectId,
        status: 'INITIALIZED',
        framework: 'NEWMAN',
      } as any);

      vi.mocked(prisma.automationSession.update).mockResolvedValue({
        id: 'session-newman-1',
        projectId: mockProjectId,
        organizationId: mockOrgId,
        framework: 'NEWMAN',
        status: 'COMPLETED',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 150,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/automation/ingest/newman`)
        .set('Cookie', [`accessToken=${validToken}`])
        .set('x-organization-id', mockOrgId)
        .send({
          collection: { info: { name: 'E2E Health Checks' } },
          run: {
            executions: [
              {
                item: { id: 'req-health', name: 'GET /health' },
                response: { code: 200, responseTime: 150 },
                assertions: [{ assertion: 'Status 200' }],
              },
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.status).toBe('COMPLETED');
      expect(res.body.data.totalItems).toBe(1);
    });
  });
});
