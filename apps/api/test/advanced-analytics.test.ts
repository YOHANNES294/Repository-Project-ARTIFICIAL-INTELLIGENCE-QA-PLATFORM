import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, ExecutionStatus, ReportType, ExportFormat } from '@ai-qa/shared-types';
import {
  FormulaSanitizer,
  ExecutiveAnalyticsService,
  ExecutionAnalyticsService,
  CoverageAnalyticsService,
  DefectAnalyticsService,
  AutomationAnalyticsService,
  MilestoneReleaseAnalyticsService,
  AIAnalyticsService,
  CustomReportService,
  ExportService,
} from '../src/services/analytics/index.js';

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
        findMany: vi.fn(),
      },
      testCase: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      testRun: {
        findMany: vi.fn(),
      },
      testResult: {
        findMany: vi.fn(),
      },
      defect: {
        findMany: vi.fn(),
      },
      milestone: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      automationSession: {
        findMany: vi.fn(),
      },
      automationUnmappedTest: {
        count: vi.fn(),
      },
      aIGeneration: {
        findMany: vi.fn(),
      },
      aIUsageLog: {
        findMany: vi.fn(),
      },
      aIFeedback: {
        findMany: vi.fn(),
      },
      projectQualityGate: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      reportDefinition: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      reportSnapshot: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      reportSchedule: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      reportDelivery: {
        create: vi.fn(),
      },
      reportExportJob: {
        create: vi.fn(),
      },
    },
  };
});

describe('Milestone 09: Advanced Analytics & Reporting', () => {
  const mockUser = {
    id: 'user-09-qa',
    email: 'analyst@ai-qa.io',
    firstName: 'Analytics',
    lastName: 'Engineer',
    isSuperAdmin: false,
  };

  const mockOrg = {
    id: 'org-m09-enterprise',
    name: 'Enterprise Analytics Corp',
    slug: 'enterprise-analytics',
  };

  const mockProject = {
    id: 'proj-m09-core',
    organizationId: mockOrg.id,
    name: 'Core SaaS App',
    key: 'CORE',
    status: 'ACTIVE',
    isArchived: false,
  };

  const validToken = generateAccessToken({
    sub: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    isSuperAdmin: mockUser.isSuperAdmin,
    orgId: mockOrg.id,
    role: OrganizationRole.QA_MANAGER,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.project.findFirst as any).mockResolvedValue(mockProject);
    (prisma.project.findUnique as any).mockResolvedValue(mockProject);
    (prisma.organizationMember.findUnique as any).mockResolvedValue({
      id: 'mem-1',
      userId: mockUser.id,
      organizationId: mockOrg.id,
      role: OrganizationRole.QA_MANAGER,
    });
    (prisma.organizationMember.findFirst as any).mockResolvedValue({
      id: 'mem-1',
      userId: mockUser.id,
      organizationId: mockOrg.id,
      role: OrganizationRole.QA_MANAGER,
    });
  });

  // ----------------------------------------------------
  // 1. FORMULA SANITIZER (OWASP CWE-1236)
  // ----------------------------------------------------
  describe('Formula Injection Defense', () => {
    it('should prefix dangerous formula triggers with a single quote', () => {
      expect(FormulaSanitizer.sanitizeCellValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(FormulaSanitizer.sanitizeCellValue('+cmd|"/C calc"!A0')).toBe("'+cmd|\"/C calc\"!A0");
      expect(FormulaSanitizer.sanitizeCellValue('-10')).toBe("'-10");
      expect(FormulaSanitizer.sanitizeCellValue('@SUM(1,2)')).toBe("'@SUM(1,2)");
      expect(FormulaSanitizer.sanitizeCellValue('\tmalicious')).toBe("'\tmalicious");
      expect(FormulaSanitizer.sanitizeCellValue('\rmalicious')).toBe("'\rmalicious");
    });

    it('should leave safe values unchanged', () => {
      expect(FormulaSanitizer.sanitizeCellValue('User Login Spec')).toBe('User Login Spec');
      expect(FormulaSanitizer.sanitizeCellValue(42)).toBe('42');
      expect(FormulaSanitizer.sanitizeCellValue(true)).toBe('true');
      expect(FormulaSanitizer.sanitizeCellValue(null)).toBe('');
      expect(FormulaSanitizer.sanitizeCellValue(undefined)).toBe('');
    });

    it('should correctly escape CSV fields containing quotes and commas', () => {
      expect(FormulaSanitizer.escapeCsvField('Hello, World')).toBe('"Hello, World"');
      expect(FormulaSanitizer.escapeCsvField('Quote "test"')).toBe('"Quote ""test"""');
      expect(FormulaSanitizer.escapeCsvField('=MALICIOUS,COMMAND')).toBe('"\'=MALICIOUS,COMMAND"');
    });
  });

  // ----------------------------------------------------
  // 2. EXECUTIVE DASHBOARD METRICS
  // ----------------------------------------------------
  describe('Executive Analytics Calculations', () => {
    it('should compute accurate KPIs and release readiness status', async () => {
      (prisma.project.findMany as any).mockResolvedValue([mockProject]);
      (prisma.testCase.findMany as any).mockResolvedValue([
        { id: 'tc-1', status: 'ACTIVE', requirementRef: 'REQ-101' },
        { id: 'tc-2', status: 'ACTIVE', requirementRef: null },
        { id: 'tc-3', status: 'DRAFT', requirementRef: null },
      ]);
      (prisma.testRun.findMany as any).mockResolvedValue([
        { id: 'run-1', isAutomated: false },
        { id: 'run-2', isAutomated: true },
      ]);
      (prisma.testResult.findMany as any).mockResolvedValue([
        {
          id: 'res-1',
          status: ExecutionStatus.PASSED,
          attemptNumber: 1,
          testRunCase: { testCaseVersion: { testCaseId: 'tc-1' }, testRun: { isAutomated: false } },
        },
        {
          id: 'res-2',
          status: ExecutionStatus.PASSED,
          attemptNumber: 1,
          testRunCase: { testCaseVersion: { testCaseId: 'tc-2' }, testRun: { isAutomated: true } },
        },
        {
          id: 'res-3',
          status: ExecutionStatus.FAILED,
          attemptNumber: 1,
          testRunCase: { testCaseVersion: { testCaseId: 'tc-2' }, testRun: { isAutomated: true } },
        },
      ]);
      (prisma.defect.findMany as any).mockResolvedValue([
        { id: 'def-1', status: 'OPEN', severity: 'HIGH', createdAt: new Date(), closedAt: null },
        { id: 'def-2', status: 'CLOSED', severity: 'LOW', createdAt: new Date(), closedAt: new Date() },
      ]);
      (prisma.milestone.findMany as any).mockResolvedValue([
        { id: 'm-1', status: 'IN_PROGRESS' },
        { id: 'm-2', status: 'COMPLETED' },
      ]);

      const metrics = await ExecutiveAnalyticsService.getExecutiveMetrics(mockProject.id, mockOrg.id);

      expect(metrics.totalProjects).toBe(1);
      expect(metrics.activeProjects).toBe(1);
      expect(metrics.totalTestCases).toBe(3);
      expect(metrics.activeTestCases).toBe(2);
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.passedTests).toBe(2);
      expect(metrics.failedTests).toBe(1);
      expect(metrics.passRate).toBe(66.7); // 2 passed out of 3 evaluated
      expect(metrics.failureRate).toBe(33.3);
      expect(metrics.openDefects).toBe(1);
      expect(metrics.criticalDefects).toBe(0);
      expect(metrics.highDefects).toBe(1);
      expect(metrics.defectResolutionRate).toBe(50.0);
      expect(metrics.activeMilestones).toBe(1);
      expect(metrics.completedMilestones).toBe(1);
      expect(metrics.releaseReadinessStatus).toBe('NOT_READY'); // passRate 66.7% < 80% is NOT_READY
    });

    it('should handle empty datasets without division by zero or NaN', async () => {
      (prisma.project.findMany as any).mockResolvedValue([]);
      (prisma.testCase.findMany as any).mockResolvedValue([]);
      (prisma.testRun.findMany as any).mockResolvedValue([]);
      (prisma.testResult.findMany as any).mockResolvedValue([]);
      (prisma.defect.findMany as any).mockResolvedValue([]);
      (prisma.milestone.findMany as any).mockResolvedValue([]);

      const metrics = await ExecutiveAnalyticsService.getExecutiveMetrics(mockProject.id, mockOrg.id);

      expect(metrics.totalTestCases).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.passRate).toBe(0);
      expect(metrics.failureRate).toBe(0);
      expect(metrics.testCoveragePercentage).toBe(0);
      expect(metrics.defectResolutionRate).toBe(0);
      expect(metrics.releaseReadinessScore).toBe(40); // 100 - 40 (passRate) - 20 (coverage) = 40
      expect(metrics.releaseReadinessStatus).toBe('NOT_READY');
    });
  });

  // ----------------------------------------------------
  // 3. DETAILED EXECUTION ANALYTICS & FLAKINESS
  // ----------------------------------------------------
  describe('Execution Analytics & Flaky Test Detection', () => {
    it('should detect flaky tests based on repeated execution status flips', async () => {
      (prisma.testRun.findMany as any).mockResolvedValue([
        { id: 'run-1', isAutomated: false, environmentId: 'env-1', environment: { id: 'env-1', name: 'Staging' } },
      ]);

      const now = new Date();
      (prisma.testResult.findMany as any).mockResolvedValue([
        {
          id: 'res-1',
          status: ExecutionStatus.PASSED,
          attemptNumber: 1,
          durationMs: 120,
          executedAt: new Date(now.getTime() - 3000),
          executedBy: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
          testRunCase: {
            id: 'rc-1',
            testRunId: 'run-1',
            testCaseVersion: {
              testCaseId: 'tc-flaky-1',
              title: 'Flaky Checkout Test',
              testCase: { id: 'tc-flaky-1', suiteId: 's1', suite: { id: 's1', name: 'Checkout Suite' } },
            },
          },
        },
        {
          id: 'res-2',
          status: ExecutionStatus.FAILED,
          attemptNumber: 2,
          durationMs: 140,
          executedAt: new Date(now.getTime() - 2000),
          executedBy: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
          testRunCase: {
            id: 'rc-1',
            testRunId: 'run-1',
            testCaseVersion: {
              testCaseId: 'tc-flaky-1',
              title: 'Flaky Checkout Test',
              testCase: { id: 'tc-flaky-1', suiteId: 's1', suite: { id: 's1', name: 'Checkout Suite' } },
            },
          },
        },
        {
          id: 'res-3',
          status: ExecutionStatus.PASSED,
          attemptNumber: 3,
          durationMs: 130,
          executedAt: new Date(now.getTime() - 1000),
          executedBy: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
          testRunCase: {
            id: 'rc-1',
            testRunId: 'run-1',
            testCaseVersion: {
              testCaseId: 'tc-flaky-1',
              title: 'Flaky Checkout Test',
              testCase: { id: 'tc-flaky-1', suiteId: 's1', suite: { id: 's1', name: 'Checkout Suite' } },
            },
          },
        },
      ]);

      const analytics = await ExecutionAnalyticsService.getDetailedExecutionAnalytics(mockProject.id);

      expect(analytics.summary.totalExecutions).toBe(3);
      expect(analytics.summary.passed).toBe(2);
      expect(analytics.summary.failed).toBe(1);
      expect(analytics.summary.retryCount).toBe(2); // attempt 2 and 3 are retries
      expect(analytics.summary.avgDurationMs).toBe(130);
      expect(analytics.flakyTestCandidates.length).toBe(1);
      expect(analytics.flakyTestCandidates[0].testCaseId).toBe('tc-flaky-1');
      expect(analytics.flakyTestCandidates[0].flakinessScore).toBe(100.0); // 2 flips across 2 transitions
      expect(analytics.environmentBreakdown.length).toBe(1);
      expect(analytics.environmentBreakdown[0].environmentName).toBe('Staging');
      expect(analytics.testSuitePerformance.length).toBe(1);
      expect(analytics.testSuitePerformance[0].suiteName).toBe('Checkout Suite');
    });

    it('should detect repeated consecutive failures', async () => {
      (prisma.testRun.findMany as any).mockResolvedValue([{ id: 'run-1', isAutomated: false }]);
      const now = new Date();
      (prisma.testResult.findMany as any).mockResolvedValue([
        {
          id: 'res-1',
          status: ExecutionStatus.FAILED,
          attemptNumber: 1,
          durationMs: 100,
          executedAt: new Date(now.getTime() - 2000),
          executedBy: null,
          testRunCase: {
            id: 'rc-2',
            testRunId: 'run-1',
            testCaseVersion: {
              testCaseId: 'tc-broken-1',
              title: 'Broken Payment API',
              testCase: { id: 'tc-broken-1', suiteId: null, suite: null },
            },
          },
        },
        {
          id: 'res-2',
          status: ExecutionStatus.FAILED,
          attemptNumber: 2,
          durationMs: 110,
          executedAt: new Date(now.getTime() - 1000),
          executedBy: null,
          testRunCase: {
            id: 'rc-2',
            testRunId: 'run-1',
            testCaseVersion: {
              testCaseId: 'tc-broken-1',
              title: 'Broken Payment API',
              testCase: { id: 'tc-broken-1', suiteId: null, suite: null },
            },
          },
        },
      ]);

      const analytics = await ExecutionAnalyticsService.getDetailedExecutionAnalytics(mockProject.id);

      expect(analytics.repeatedFailures.length).toBe(1);
      expect(analytics.repeatedFailures[0].testCaseId).toBe('tc-broken-1');
      expect(analytics.repeatedFailures[0].consecutiveFailures).toBe(2);
    });
  });

  // ----------------------------------------------------
  // 4. TEST COVERAGE ANALYTICS
  // ----------------------------------------------------
  describe('Test Coverage Analytics', () => {
    it('should accurately categorize existence, execution, requirement, and automation coverage', async () => {
      (prisma.testCase.findMany as any).mockResolvedValue([
        {
          id: 'tc-1',
          status: 'ACTIVE',
          suiteId: 's1',
          suite: { id: 's1', name: 'Auth' },
          requirementRef: 'JIRA-101',
          automationMappings: [{ id: 'map-1' }],
          versions: [{ runCases: [{ id: 'rc-1', status: ExecutionStatus.PASSED }] }],
        },
        {
          id: 'tc-2',
          status: 'ACTIVE',
          suiteId: 's1',
          suite: { id: 's1', name: 'Auth' },
          requirementRef: null,
          automationMappings: [],
          versions: [{ runCases: [] }],
        },
        {
          id: 'tc-3',
          status: 'DRAFT',
          suiteId: null,
          suite: null,
          requirementRef: null,
          automationMappings: [],
          versions: [],
        },
      ]);
      (prisma.milestone.findMany as any).mockResolvedValue([
        {
          id: 'm1',
          name: 'Sprint 1',
          testCases: [{ id: 'tc-1' }],
        },
      ]);

      const coverage = await CoverageAnalyticsService.getCoverageAnalytics(mockProject.id);

      expect(coverage.existenceCoverage.totalCases).toBe(3);
      expect(coverage.existenceCoverage.activeCases).toBe(2);
      expect(coverage.existenceCoverage.draftCases).toBe(1);

      expect(coverage.executionCoverage.totalEligibleCases).toBe(2);
      expect(coverage.executionCoverage.executedCases).toBe(1);
      expect(coverage.executionCoverage.unexecutedCases).toBe(1);
      expect(coverage.executionCoverage.executionCoverageRate).toBe(50.0);

      expect(coverage.requirementCoverage.totalCases).toBe(3);
      expect(coverage.requirementCoverage.linkedToRequirements).toBe(1);
      expect(coverage.requirementCoverage.requirementCoverageRate).toBe(33.3);
      expect(coverage.requirementCoverage.isAvailable).toBe(true);

      expect(coverage.automationCoverage.automatedCases).toBe(1);
      expect(coverage.automationCoverage.manualCases).toBe(1);
      expect(coverage.automationCoverage.automationCoverageRate).toBe(50.0);

      expect(coverage.suiteCoverage.length).toBe(2);
      expect(coverage.suiteCoverage[0].suiteName).toBe('Auth');
      expect(coverage.suiteCoverage[0].coverageRate).toBe(50.0);

      expect(coverage.milestoneCoverage.length).toBe(1);
      expect(coverage.milestoneCoverage[0].coverageRate).toBe(100.0);
    });
  });

  // ----------------------------------------------------
  // 5. DEFECT ANALYTICS
  // ----------------------------------------------------
  describe('Defect Analytics', () => {
    it('should calculate aging, resolution duration, reopen rate, and test traceability', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      (prisma.defect.findMany as any).mockResolvedValue([
        {
          id: 'def-1',
          status: 'OPEN',
          severity: 'CRITICAL',
          priority: 'URGENT',
          component: 'Authentication',
          createdAt: tenDaysAgo,
          closedAt: null,
          environment: { id: 'env-1', name: 'Production' },
          milestone: { id: 'm-1', name: 'Q1 Release' },
          testLinks: [{ id: 'tl-1', testCaseId: 'tc-1', testResultId: 'res-1' }],
          history: [{ id: 'h-1' }], // was reopened
        },
        {
          id: 'def-2',
          status: 'CLOSED',
          severity: 'LOW',
          priority: 'LOW',
          component: 'UI',
          createdAt: tenDaysAgo,
          closedAt: twoDaysAgo, // duration: 8 days = 192 hours
          environment: null,
          milestone: null,
          testLinks: [],
          history: [],
        },
      ]);

      const analytics = await DefectAnalyticsService.getDefectAnalytics(mockProject.id);

      expect(analytics.summary.totalCreated).toBe(2);
      expect(analytics.summary.openCount).toBe(1);
      expect(analytics.summary.closedCount).toBe(1);
      expect(analytics.summary.criticalCount).toBe(1);
      expect(analytics.summary.avgResolutionHours).toBe(192);
      expect(analytics.summary.reopenRate).toBe(100); // 1 reopened out of 1 resolved
      expect(analytics.traceability.testTraceabilityRate).toBe(50.0); // 1 linked out of 2
      expect(analytics.traceability.linkedToTestExecutions).toBe(1);

      const age8to14 = analytics.defectAging.find((a) => a.ageBucket === '8-14 days');
      expect(age8to14?.count).toBe(1); // def-1 is 10 days old and OPEN
    });
  });

  // ----------------------------------------------------
  // 6. AUTOMATION ANALYTICS
  // ----------------------------------------------------
  describe('Automation Analytics', () => {
    it('should aggregate test outcomes from M08 sessions and runners', async () => {
      (prisma.automationSession.findMany as any).mockResolvedValue([
        {
          id: 'sess-1',
          framework: 'PLAYWRIGHT',
          browser: 'Chromium',
          ciProvider: 'GITHUB_ACTIONS',
          totalTests: 10,
          passedTests: 8,
          failedTests: 2,
          skippedTests: 0,
          durationMs: 45000,
          createdAt: new Date(),
        },
        {
          id: 'sess-2',
          framework: 'NEWMAN',
          browser: 'Headless',
          ciProvider: 'LOCAL',
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          durationMs: 5000,
          createdAt: new Date(),
        },
      ]);
      (prisma.automationUnmappedTest.count as any).mockResolvedValue(3);
      (prisma.testRun.findMany as any).mockResolvedValue([]);

      const analytics = await AutomationAnalyticsService.getAutomationAnalytics(mockProject.id);

      expect(analytics.summary.totalSessions).toBe(2);
      expect(analytics.summary.totalTestsExecuted).toBe(15);
      expect(analytics.summary.passedTests).toBe(13);
      expect(analytics.summary.failedTests).toBe(2);
      expect(analytics.summary.passRate).toBe(86.7);
      expect(analytics.summary.unmappedCount).toBe(3);
      expect(analytics.summary.avgDurationMs).toBe(25000);

      const pw = analytics.frameworkDistribution.find((f) => f.framework === 'PLAYWRIGHT');
      expect(pw?.executions).toBe(10);
      expect(pw?.passRate).toBe(80.0);

      const gh = analytics.ciProviderBreakdown.find((c) => c.provider === 'GITHUB_ACTIONS');
      expect(gh?.sessionsCount).toBe(1);
      expect(gh?.failedSessions).toBe(1);
    });
  });

  // ----------------------------------------------------
  // 7. MILESTONE RELEASE & QUALITY GATES
  // ----------------------------------------------------
  describe('Milestone Release Analytics & Quality Gates', () => {
    it('should evaluate quality gate rules and provide explainable recommendations', async () => {
      (prisma.milestone.findFirst as any).mockResolvedValue({
        id: 'ms-1',
        projectId: mockProject.id,
        name: 'Release 1.0',
        status: 'IN_PROGRESS',
        project: { organizationId: mockOrg.id },
        testRuns: [
          {
            id: 'r1',
            status: 'COMPLETED',
            cases: [
              { id: 'rc1', status: 'PASSED' },
              { id: 'rc2', status: 'PASSED' },
              { id: 'rc3', status: 'FAILED' },
            ],
          },
        ],
        defects: [
          { id: 'd1', status: 'OPEN', severity: 'CRITICAL' },
        ],
      });

      (prisma.projectQualityGate.findFirst as any).mockResolvedValue({
        id: 'qg-1',
        projectId: mockProject.id,
        name: 'Strict Production Gate',
        minTestPassRate: 95.0,
        maxCriticalDefects: 0,
        maxHighDefects: 1,
        minExecutionCoverage: 80.0,
        requireZeroBlockers: true,
      });

      const result = await MilestoneReleaseAnalyticsService.getMilestoneReleaseAnalytics(
        mockProject.id,
        'ms-1'
      );

      expect(result.testRunStats.totalCases).toBe(3);
      expect(result.testRunStats.passedCases).toBe(2);
      expect(result.testRunStats.passRate).toBe(66.7);
      expect(result.defectStats.criticalDefects).toBe(1);
      expect(result.qualityGateEvaluation.passed).toBe(false);
      expect(result.qualityGateEvaluation.recommendation).toBe('BLOCKED_DO_NOT_RELEASE');

      const passRateRule = result.qualityGateEvaluation.rules.find((r) => r.ruleKey === 'minTestPassRate');
      expect(passRateRule?.passed).toBe(false);

      const critRule = result.qualityGateEvaluation.rules.find((r) => r.ruleKey === 'maxCriticalDefects');
      expect(critRule?.passed).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 8. AI INTELLIGENCE ANALYTICS
  // ----------------------------------------------------
  describe('AI Intelligence Analytics', () => {
    it('should aggregate proposal review rates, token usage, and feedback metrics', async () => {
      (prisma.aIGeneration.findMany as any).mockResolvedValue([
        {
          id: 'gen-1',
          items: [
            { id: 'it-1', reviewStatus: 'ACCEPTED' },
            { id: 'it-2', reviewStatus: 'ACCEPTED' },
            { id: 'it-3', reviewStatus: 'REJECTED' },
          ],
        },
      ]);
      (prisma.aIUsageLog.findMany as any).mockResolvedValue([
        {
          id: 'log-1',
          feature: 'TEST_GENERATION',
          provider: 'OPENAI',
          modelName: 'gpt-4o-mini',
          tokensUsed: 1500,
          estimatedCost: 0.0025,
          durationMs: 800,
          success: true,
        },
      ]);
      (prisma.aIFeedback.findMany as any).mockResolvedValue([
        { rating: 5, ratingCategory: 'HELPFUL' },
        { rating: 1, ratingCategory: 'INACCURATE' },
      ]);

      const metrics = await AIAnalyticsService.getAIMetrics(mockProject.id, mockOrg.id);

      expect(metrics.summary.totalGenerations).toBe(1);
      expect(metrics.summary.totalProposedCases).toBe(3);
      expect(metrics.summary.acceptedCases).toBe(2);
      expect(metrics.summary.rejectedCases).toBe(1);
      expect(metrics.summary.humanAcceptanceRate).toBe(66.7);
      expect(metrics.summary.totalTokensConsumed).toBe(1500);
      expect(metrics.summary.estimatedTotalCost).toBe(0.0025);
      expect(metrics.userFeedbackSummary.totalRatings).toBe(2);
      expect(metrics.userFeedbackSummary.satisfactionRate).toBe(50.0);
    });
  });

  // ----------------------------------------------------
  // 9. EXPORT ENGINE (CSV, XLSX, PDF)
  // ----------------------------------------------------
  describe('Export Engine (CSV, XLSX, PDF)', () => {
    beforeEach(() => {
      // Mock runReport for exports
      vi.spyOn(CustomReportService, 'runReport').mockResolvedValue({
        totalTestCases: 10,
        activeTestCases: 8,
        testCoveragePercentage: 80.0,
        totalExecutions: 25,
        passedTests: 20,
        failedTests: 5,
        blockedTests: 0,
        skippedTests: 0,
        passRate: 80.0,
        failureRate: 20.0,
        openDefects: 2,
        criticalDefects: 0,
        highDefects: 1,
        defectResolutionRate: 90.0,
        automationExecutions: 15,
        automationPassRate: 85.0,
        releaseReadinessScore: 88,
        releaseReadinessStatus: 'READY',
      } as any);
    });

    it('should generate valid CSV with formula injection defense and clean headers', async () => {
      const csv = await ExportService.exportToCsv(mockProject.id, mockOrg.id, ReportType.EXECUTIVE);

      expect(csv.filename).toMatch(/executive_report_.*\.csv/);
      expect(csv.contentType).toContain('text/csv');
      expect(csv.content).toContain('EXECUTIVE Quality Report');
      expect(csv.content).toContain('Pass Rate %,80%');
      expect(csv.content).toContain('Release Readiness Status,READY');
    });

    it('should generate a valid XLSX buffer with Excel workbook structure', async () => {
      const xlsx = await ExportService.exportToXlsx(mockProject.id, mockOrg.id, ReportType.EXECUTIVE);

      expect(xlsx.filename).toMatch(/executive_report_.*\.xlsx/);
      expect(xlsx.contentType).toContain('openxmlformats-officedocument.spreadsheetml');
      expect(Buffer.isBuffer(xlsx.buffer)).toBe(true);
      expect(xlsx.buffer.length).toBeGreaterThan(100);
    });

    it('should generate a valid PDF buffer starting with standard PDF signature', async () => {
      const pdf = await ExportService.exportToPdf(mockProject.id, mockOrg.id, ReportType.EXECUTIVE);

      expect(pdf.filename).toMatch(/executive_report_.*\.pdf/);
      expect(pdf.contentType).toBe('application/pdf');
      expect(Buffer.isBuffer(pdf.buffer)).toBe(true);
      expect(pdf.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    });
  });

  // ----------------------------------------------------
  // 10. HTTP ENDPOINTS & MULTI-TENANT ISOLATION
  // ----------------------------------------------------
  describe('HTTP REST Endpoints', () => {
    const app = createApp();

    it('GET /api/v1/projects/:projectId/analytics/executive should return metrics for authenticated tenant', async () => {
      (prisma.project.findMany as any).mockResolvedValue([mockProject]);
      (prisma.testCase.findMany as any).mockResolvedValue([]);
      (prisma.testRun.findMany as any).mockResolvedValue([]);
      (prisma.testResult.findMany as any).mockResolvedValue([]);
      (prisma.defect.findMany as any).mockResolvedValue([]);
      (prisma.milestone.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/projects/${mockProject.id}/analytics/executive`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('releaseReadinessScore');
      expect(res.body.data).toHaveProperty('passRate');
    });

    it('GET /api/v1/projects/:projectId/analytics/executions should return execution analytics', async () => {
      (prisma.testRun.findMany as any).mockResolvedValue([]);
      (prisma.testResult.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/projects/${mockProject.id}/analytics/executions`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('flakyTestCandidates');
    });

    it('POST /api/v1/projects/:projectId/analytics/reports should create custom report definition', async () => {
      (prisma.reportDefinition.create as any).mockResolvedValue({
        id: 'rep-def-1',
        projectId: mockProject.id,
        name: 'Weekly Executive QA',
        type: 'EXECUTIVE',
        metrics: ['passRate', 'openDefects'],
        dimensions: ['status'],
        filters: {},
        isTemplate: false,
        createdById: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/projects/${mockProject.id}/analytics/reports`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Weekly Executive QA',
          type: 'EXECUTIVE',
          metrics: ['passRate', 'openDefects'],
          dimensions: ['status'],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Weekly Executive QA');
    });

    it('POST /api/v1/projects/:projectId/analytics/export should stream CSV export file', async () => {
      vi.spyOn(CustomReportService, 'runReport').mockResolvedValue({
        totalTestCases: 5,
        activeTestCases: 5,
        testCoveragePercentage: 100,
        totalExecutions: 10,
        passedTests: 9,
        failedTests: 1,
        blockedTests: 0,
        skippedTests: 0,
        passRate: 90.0,
        failureRate: 10.0,
        openDefects: 0,
        criticalDefects: 0,
        highDefects: 0,
        defectResolutionRate: 100,
        automationExecutions: 0,
        automationPassRate: 0,
        releaseReadinessScore: 95,
        releaseReadinessStatus: 'READY',
      } as any);

      (prisma.reportExportJob.create as any).mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
      });

      const res = await request(app)
        .post(`/api/v1/projects/${mockProject.id}/analytics/export`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          reportType: 'EXECUTIVE',
          format: 'CSV',
          name: 'Weekly Release',
        })
        .expect(200);

      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Weekly Release');
    });

    it('should reject unauthenticated requests with HTTP 401', async () => {
      await request(app)
        .get(`/api/v1/projects/${mockProject.id}/analytics/executive`)
        .expect(401);
    });
  });
});
