import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateAccessToken } from '../src/utils/security.js';
import { OrganizationRole, TestPriority, TestType, TestCaseStatus } from '@ai-qa/shared-types';
import { csvService } from '../src/services/csv.service.js';

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
        create: vi.fn(),
      },
      tag: {
        upsert: vi.fn(),
      },
      testCase: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      testCaseVersion: {
        create: vi.fn(),
      },
      testStep: {
        createMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('CSV Import & Export Engine with Formula Injection Protection', () => {
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

  it('Formula Injection Sanitization > sanitizes dangerous spreadsheet triggers (=, +, -, @)', () => {
    expect(csvService.sanitizeCsvFormula('=SUM(1+1)')).toBe("'=SUM(1+1)");
    expect(csvService.sanitizeCsvFormula('+123456789')).toBe("'+123456789");
    expect(csvService.sanitizeCsvFormula('-100')).toBe("'-100");
    expect(csvService.sanitizeCsvFormula('@cmd')).toBe("'@cmd");
    expect(csvService.sanitizeCsvFormula('Standard Title')).toBe('Standard Title');
  });

  it('POST /api/v1/projects/:projectId/test-cases/csv/preview > parses valid and detects invalid rows', async () => {
    const csvContent = `Title,Description,Priority,Type,Action,ExpectedResult
Verify Login Form,Test form renders,HIGH,FUNCTIONAL,Open /login,Form renders
AB,Title too short,MEDIUM,SMOKE,Click submit,Validation error`; // 2nd row has title "AB" which fails min(3)

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-cases/csv/preview`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ csvContent });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRows).toBe(2);
    expect(res.body.data.validRows).toBe(1);
    expect(res.body.data.invalidRows).toBe(1);
    expect(res.body.data.preview[0].isValid).toBe(true);
    expect(res.body.data.preview[1].isValid).toBe(false);
    expect(res.body.data.preview[1].errors[0]).toMatch(/title/i);
  });

  it('POST /api/v1/projects/:projectId/test-cases/csv/import > bulk imports test cases within transaction', async () => {
    const payload = {
      rows: [
        {
          title: 'Bulk Test Case 1',
          priority: 'CRITICAL',
          type: 'REGRESSION',
          status: 'ACTIVE',
          suiteName: 'Regression Suite',
          tags: ['automated', 'nightly'],
          steps: [
            {
              stepNumber: 1,
              action: 'Run automated check',
              expectedResult: 'Passed with 0 errors',
            },
          ],
        },
      ],
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        testCase: {
          findFirst: vi.fn().mockResolvedValue({ caseNumber: 10 }),
          create: vi.fn().mockResolvedValue({ id: 'tc-new-1', caseNumber: 11 }),
        },
        testSuite: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'suite-reg', name: 'Regression Suite' }),
        },
        tag: {
          upsert: vi.fn().mockResolvedValue({ id: 'tag-1' }),
        },
        testCaseVersion: {
          create: vi.fn().mockResolvedValue({ id: 'ver-1' }),
        },
        testStep: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/test-cases/csv/import`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.importedCount).toBe(1);
  });

  it('GET /api/v1/projects/:projectId/test-cases/csv/export > exports test cases with sanitized spreadsheet formulas', async () => {
    const mockCases = [
      {
        id: 'tc-1',
        caseNumber: 1,
        title: '=HYPERLINK("http://malicious.site")', // Dangerous formula injection!
        description: '+Cmd|\' /C calc\'!A0', // Dangerous formula injection!
        preconditions: 'None',
        objectives: 'Test',
        priority: TestPriority.HIGH,
        type: TestType.FUNCTIONAL,
        status: TestCaseStatus.ACTIVE,
        estimatedTimeMin: 10,
        suite: { name: 'Security Suite' },
        milestone: { name: 'M1 Release' },
        tags: [{ name: 'sec' }],
        versions: [
          {
            versionNumber: 1,
            steps: [
              {
                stepNumber: 1,
                action: '@SUM(A1:A10)', // Dangerous formula injection!
                testData: 'input',
                expectedResult: 'Safe result',
              },
            ],
          },
        ],
      },
    ];

    vi.mocked(prisma.testCase.findMany).mockResolvedValue(mockCases as any);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/test-cases/csv/export`)
      .set('Authorization', `Bearer ${engineerToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/text\/csv/);
    const csvText = res.text;

    // Verify CSV injection protection prefixes single quote (')
    expect(csvText).toContain("'=HYPERLINK");
    expect(csvText).toContain("'+Cmd");
    expect(csvText).toContain("'@SUM");
  });
});
