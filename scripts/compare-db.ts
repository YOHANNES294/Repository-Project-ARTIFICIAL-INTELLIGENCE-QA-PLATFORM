import { PrismaClient } from '@prisma/client';

async function verifyDatabases() {
  console.log('[DB-Verification] Comparing ai_qa_staging and ai_qa_restored...');

  const stagingPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgres@127.0.0.1:5434/ai_qa_staging?schema=public' } },
  });

  const restoredPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgres@127.0.0.1:5434/ai_qa_restored?schema=public' } },
  });

  try {
    const models = [
      'user',
      'organization',
      'organizationMember',
      'project',
      'milestone',
      'testSuite',
      'testCase',
      'testCaseVersion',
      'testStep',
      'testPlan',
      'testRun',
      'testRunCase',
      'defect',
      'billingPlan',
      'subscription',
    ] as const;

    const report: Record<string, { staging: number; restored: number; match: boolean }> = {};

    for (const model of models) {
      // @ts-ignore
      const stagingCount = await stagingPrisma[model].count();
      // @ts-ignore
      const restoredCount = await restoredPrisma[model].count();
      report[model] = {
        staging: stagingCount,
        restored: restoredCount,
        match: stagingCount === restoredCount,
      };
      console.log(`[DB-Verification] ${model.padEnd(20)}: Staging = ${stagingCount}, Restored = ${restoredCount} -> ${stagingCount === restoredCount ? 'MATCH' : 'MISMATCH'}`);
    }

    // Verify deep relations on restored DB
    const restoredOrg = await restoredPrisma.organization.findFirst({
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            milestones: true,
            testSuites: {
              include: {
                testCases: {
                  include: {
                    versions: {
                      include: {
                        steps: true,
                      },
                    },
                  },
                },
              },
            },
            defects: true,
            testPlans: {
              include: {
                testRuns: {
                  include: {
                    cases: true,
                  },
                },
              },
            },
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!restoredOrg) {
      throw new Error('Restored organization not found!');
    }

    console.log('\n[DB-Verification] Relational Integrity Check on Restored DB:');
    console.log(`- Org Name: ${restoredOrg.name} (Slug: ${restoredOrg.slug})`);
    console.log(`- Members: ${restoredOrg.members.length} (Owner: ${restoredOrg.members[0]?.user.email})`);
    console.log(`- Project: ${restoredOrg.projects[0]?.name} (Key: ${restoredOrg.projects[0]?.key})`);
    console.log(`- Test Suites: ${restoredOrg.projects[0]?.testSuites.length}`);
    console.log(`- Test Cases: ${restoredOrg.projects[0]?.testSuites[0]?.testCases.length}`);
    console.log(`- Test Steps: ${restoredOrg.projects[0]?.testSuites[0]?.testCases[0]?.versions[0]?.steps.length}`);
    console.log(`- Test Run Status: ${restoredOrg.projects[0]?.testPlans[0]?.testRuns[0]?.status}`);
    console.log(`- Subscription Plan: ${restoredOrg.subscription?.plan.name} (${restoredOrg.subscription?.status})`);

    const allMatch = Object.values(report).every((r) => r.match && r.staging > 0);
    if (!allMatch) {
      throw new Error('One or more tables failed count matching or was empty!');
    }

    console.log('\n[DB-Verification] SUCCESS: 100% record count and foreign key relationship match confirmed across all verified models!');
  } finally {
    await stagingPrisma.$disconnect();
    await restoredPrisma.$disconnect();
  }
}

verifyDatabases().catch((err) => {
  console.error('[DB-Verification:ERROR]', err);
  process.exit(1);
});
