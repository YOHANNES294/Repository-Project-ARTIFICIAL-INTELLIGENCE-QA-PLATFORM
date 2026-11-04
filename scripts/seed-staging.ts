import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5434/ai_qa_staging?schema=public',
    },
  },
});

async function main() {
  console.log('[Seed] Seeding staging database with representative multi-tenant records...');

  // Clean tables in reverse dependency order
  await prisma.testRunCase.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testPlanCase.deleteMany();
  await prisma.testPlan.deleteMany();
  await prisma.defectComment.deleteMany();
  await prisma.defect.deleteMany();
  await prisma.testCaseVersion.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.testSuite.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.billingPlan.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // 1. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@platform.staging.local',
      passwordHash: '$2b$12$eWzYqYg5q7jZ6rM6P4QpG.wN/0iF8KkK3XbM3N6K3j2V3Z2X2Q1uW', // password
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      isSuperAdmin: true,
      isEmailVerified: true,
    },
  });

  // 2. Organization 1 (Acme Corp)
  const org1 = await prisma.organization.create({
    data: {
      name: 'Acme QA Innovations',
      slug: 'acme-qa',
    },
  });

  // 3. Org 1 Users
  const user1 = await prisma.user.create({
    data: {
      email: 'sarah.lead@acme.staging.local',
      passwordHash: '$2b$12$eWzYqYg5q7jZ6rM6P4QpG.wN/0iF8KkK3XbM3N6K3j2V3Z2X2Q1uW',
      firstName: 'Sarah',
      lastName: 'Lead',
      isEmailVerified: true,
    },
  });

  const member1 = await prisma.organizationMember.create({
    data: {
      organizationId: org1.id,
      userId: user1.id,
      role: 'OWNER',
    },
  });

  // 4. Project
  const project1 = await prisma.project.create({
    data: {
      organizationId: org1.id,
      name: 'Core Platform QA',
      key: 'CORE',
      description: 'Primary platform integration test suite',
    },
  });

  // 5. Milestone
  const milestone1 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: 'v1.0.0 Production Release',
      releaseVer: '1.0.0',
      objectives: 'Verify staging acceptance criteria',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      startDate: new Date('2026-10-01'),
      dueDate: new Date('2026-11-15'),
    },
  });

  // 6. Test Suite
  const suite1 = await prisma.testSuite.create({
    data: {
      projectId: project1.id,
      name: 'Authentication & Security',
      description: 'End-to-end security and auth checks',
    },
  });

  // 7. Test Case & Version
  const testCase1 = await prisma.testCase.create({
    data: {
      projectId: project1.id,
      suiteId: suite1.id,
      caseNumber: 1,
      title: 'Verify OAuth2 SSO Authentication Flow',
      priority: 'HIGH',
      type: 'FUNCTIONAL',
      status: 'ACTIVE',
      type: 'FUNCTIONAL',
      currentVersion: 1,
    },
  });

  const testCaseVersion1 = await prisma.testCaseVersion.create({
    data: {
      testCaseId: testCase1.id,
      versionNumber: 1,
      title: 'Verify OAuth2 SSO Authentication Flow',
      priority: 'HIGH',
      type: 'FUNCTIONAL',
      preconditions: 'Tenant SSO configured with Okta',
      acceptanceCriteria: 'User session active with tenant permissions',
      status: 'ACTIVE',
      createdById: user1.id,
      steps: {
        create: [
          { stepNumber: 1, action: 'Click Login with SSO', expectedResult: 'Redirect to IdP' },
          { stepNumber: 2, action: 'Enter credentials', expectedResult: 'Redirect to Dashboard' },
        ],
      },
    },
  });

  // 8. Test Plan & Test Run
  const plan1 = await prisma.testPlan.create({
    data: {
      projectId: project1.id,
      milestoneId: milestone1.id,
      planNumber: 1,
      name: 'Staging Smoke Plan',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });

  const run1 = await prisma.testRun.create({
    data: {
      projectId: project1.id,
      testPlanId: plan1.id,
      runNumber: 1,
      name: 'Staging Release Gate Execution',
      status: 'COMPLETED',
    },
  });

  const runCase1 = await prisma.testRunCase.create({
    data: {
      testRunId: run1.id,
      testCaseVersionId: testCaseVersion1.id,
      status: 'PASSED',
      orderIndex: 1,
    },
  });

  // 9. Defect
  const defect1 = await prisma.defect.create({
    data: {
      projectId: project1.id,
      defectNumber: 1,
      title: 'Session expiration dialog not dismissing on re-auth',
      description: 'Modal backdrop persists after refresh',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      status: 'OPEN',
      reporterId: user1.id,
    },
  });

  // 10. Billing Plan & Subscription
  const proPlan = await prisma.billingPlan.create({
    data: {
      name: 'Professional Plan',
      tier: 'PROFESSIONAL',
      description: 'Full-featured QA intelligence for agile teams',
      priceCentsMonth: 9900,
      priceCentsYear: 99000,
      maxProjects: 25,
      maxMembers: 50,
      maxTestCases: 10000,
      isActive: true,
    },
  });

  const subscription1 = await prisma.subscription.create({
    data: {
      organization: { connect: { id: org1.id } },
      plan: { connect: { id: proPlan.id } },
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('[Seed] Seeding completed successfully!');
  console.log(`[Seed] Organizations: 1, Users: 2, Projects: 1, TestCases: 1, TestRuns: 1, Defects: 1, Plans: 1`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
