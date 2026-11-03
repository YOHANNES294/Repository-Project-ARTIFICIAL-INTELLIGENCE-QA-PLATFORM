import { prisma } from '../prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors.js';
import { createAuditLog } from './audit.service.js';
import {
  CreateTestPlanInput,
  UpdateTestPlanInput,
  DuplicateTestPlanInput,
  SelectPlanCasesInput,
  TestPlanStatus,
  TestPriority,
} from '@ai-qa/shared-types';

export class TestPlanService {
  private static async getNextPlanNumber(projectId: string): Promise<number> {
    const highest = await prisma.testPlan.findFirst({
      where: { projectId },
      orderBy: { planNumber: 'desc' },
      select: { planNumber: true },
    });
    return (highest?.planNumber || 0) + 1;
  }

  static async getTestPlans(
    projectId: string,
    params: {
      search?: string;
      status?: TestPlanStatus;
      milestoneId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { search, status, milestoneId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const where: any = { projectId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    const [testPlans, total] = await Promise.all([
      prisma.testPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          milestone: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
          manager: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: {
            select: {
              selectedCases: true,
              testRuns: true,
            },
          },
        },
      }),
      prisma.testPlan.count({ where }),
    ]);

    const formattedPlans = testPlans.map((plan: any) => ({
      ...plan,
      key: `${project.key}-TP-${plan.planNumber}`,
    }));

    return {
      testPlans: formattedPlans,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTestPlanById(projectId: string, planId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const plan = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: {
        milestone: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            selectedCases: true,
            testRuns: true,
          },
        },
      },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    return {
      ...plan,
      key: `${project.key}-TP-${plan.planNumber}`,
    };
  }

  static async createTestPlan(
    projectId: string,
    input: CreateTestPlanInput,
    userId?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true, organizationId: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Validate milestone belongs to project
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: input.milestoneId },
        select: { projectId: true },
      });
      if (!milestone || milestone.projectId !== projectId) {
        throw new ValidationError('Selected milestone does not belong to this project');
      }
    }

    // Validate environment belongs to project
    if (input.environmentId) {
      const env = await prisma.environment.findUnique({
        where: { id: input.environmentId },
        select: { projectId: true },
      });
      if (!env || env.projectId !== projectId) {
        throw new ValidationError('Selected environment does not belong to this project');
      }
    }

    // Validate dates
    if (input.startDate && input.endDate) {
      if (new Date(input.endDate) < new Date(input.startDate)) {
        throw new ValidationError('End date must be greater than or equal to start date');
      }
    }

    const planNumber = await this.getNextPlanNumber(projectId);

    const testPlan = await prisma.testPlan.create({
      data: {
        projectId,
        planNumber,
        name: input.name,
        description: input.description || null,
        objectives: input.objectives || null,
        scope: input.scope || null,
        strategy: input.strategy || null,
        status: (input.status as any) || TestPlanStatus.DRAFT,
        priority: (input.priority as any) || TestPriority.MEDIUM,
        milestoneId: input.milestoneId || null,
        environmentId: input.environmentId || null,
        managerId: input.managerId || null,
        entryCriteria: input.entryCriteria || null,
        exitCriteria: input.exitCriteria || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
      include: {
        milestone: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            selectedCases: true,
            testRuns: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      userId,
      action: 'TEST_PLAN_CREATED',
      entityType: 'TestPlan',
      entityId: testPlan.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        name: testPlan.name,
        planNumber: testPlan.planNumber,
      },
    });

    return {
      ...testPlan,
      key: `${project.key}-TP-${testPlan.planNumber}`,
    };
  }

  static async updateTestPlan(
    projectId: string,
    planId: string,
    input: UpdateTestPlanInput,
    userId?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const existing = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: {
        project: { select: { id: true, key: true, organizationId: true } },
      },
    });

    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    // Validate milestone
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: input.milestoneId },
        select: { projectId: true },
      });
      if (!milestone || milestone.projectId !== projectId) {
        throw new ValidationError('Selected milestone does not belong to this project');
      }
    }

    // Validate environment
    if (input.environmentId) {
      const env = await prisma.environment.findUnique({
        where: { id: input.environmentId },
        select: { projectId: true },
      });
      if (!env || env.projectId !== projectId) {
        throw new ValidationError('Selected environment does not belong to this project');
      }
    }

    const startDate = input.startDate !== undefined
      ? (input.startDate ? new Date(input.startDate) : null)
      : existing.startDate;
    const endDate = input.endDate !== undefined
      ? (input.endDate ? new Date(input.endDate) : null)
      : existing.endDate;

    if (startDate && endDate && endDate < startDate) {
      throw new ValidationError('End date must be greater than or equal to start date');
    }

    const updated = await prisma.testPlan.update({
      where: { id: planId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.objectives !== undefined && { objectives: input.objectives }),
        ...(input.scope !== undefined && { scope: input.scope }),
        ...(input.strategy !== undefined && { strategy: input.strategy }),
        ...(input.status !== undefined && { status: input.status as any }),
        ...(input.priority !== undefined && { priority: input.priority as any }),
        ...(input.milestoneId !== undefined && { milestoneId: input.milestoneId }),
        ...(input.environmentId !== undefined && { environmentId: input.environmentId }),
        ...(input.managerId !== undefined && { managerId: input.managerId }),
        ...(input.entryCriteria !== undefined && { entryCriteria: input.entryCriteria }),
        ...(input.exitCriteria !== undefined && { exitCriteria: input.exitCriteria }),
        ...(input.startDate !== undefined && { startDate }),
        ...(input.endDate !== undefined && { endDate }),
      },
      include: {
        milestone: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            selectedCases: true,
            testRuns: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: existing.project.organizationId,
      userId,
      action: 'TEST_PLAN_UPDATED',
      entityType: 'TestPlan',
      entityId: planId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        updatedFields: Object.keys(input),
      },
    });

    return {
      ...updated,
      key: `${existing.project.key}-TP-${updated.planNumber}`,
    };
  }

  static async deleteTestPlan(
    projectId: string,
    planId: string,
    userId?: string
  ) {
    const existing = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: {
        project: { select: { organizationId: true } },
        _count: { select: { testRuns: true } },
      },
    });

    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    if (existing._count.testRuns > 0) {
      throw new ConflictError(
        'Cannot delete test plan with associated test runs. Archive the plan instead.'
      );
    }

    await prisma.testPlan.delete({
      where: { id: planId },
    });

    await createAuditLog({
      organizationId: existing.project.organizationId,
      userId,
      action: 'TEST_PLAN_DELETED',
      entityType: 'TestPlan',
      entityId: planId,
      metadata: { name: existing.name },
    });

    return { message: 'Test plan successfully deleted' };
  }

  static async duplicateTestPlan(
    projectId: string,
    planId: string,
    input: DuplicateTestPlanInput,
    userId?: string
  ) {
    const original = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: {
        selectedCases: true,
        project: { select: { id: true, key: true, organizationId: true } },
      },
    });

    if (!original || original.projectId !== projectId) {
      throw new NotFoundError('Original test plan not found');
    }

    const planNumber = await this.getNextPlanNumber(projectId);

    const duplicated = await prisma.$transaction(async (tx: any) => {
      const newPlan = await tx.testPlan.create({
        data: {
          projectId,
          planNumber,
          name: input.name,
          description: original.description,
          objectives: original.objectives,
          scope: original.scope,
          strategy: original.strategy,
          status: TestPlanStatus.DRAFT,
          priority: original.priority,
          milestoneId: original.milestoneId,
          environmentId: original.environmentId,
          managerId: userId || original.managerId,
          entryCriteria: original.entryCriteria,
          exitCriteria: original.exitCriteria,
          startDate: original.startDate,
          endDate: original.endDate,
        },
      });

      if (input.includeCases && original.selectedCases.length > 0) {
        await tx.testPlanCase.createMany({
          data: original.selectedCases.map((sc: any) => ({
            testPlanId: newPlan.id,
            testCaseId: sc.testCaseId,
            testCaseVersionId: sc.testCaseVersionId,
          })),
        });
      }

      return newPlan;
    });

    await createAuditLog({
      organizationId: original.project.organizationId,
      userId,
      action: 'TEST_PLAN_DUPLICATED',
      entityType: 'TestPlan',
      entityId: duplicated.id,
      metadata: { originalPlanId: planId, name: duplicated.name },
    });

    return this.getTestPlanById(projectId, duplicated.id);
  }

  // ----------------------------------------------------
  // TEST PLAN CASE SELECTION
  // ----------------------------------------------------
  static async getPlanCases(projectId: string, planId: string) {
    const plan = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: { project: { select: { key: true } } },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    const planCases = await prisma.testPlanCase.findMany({
      where: { testPlanId: planId },
      include: {
        testCase: {
          include: {
            suite: { select: { id: true, name: true } },
            tags: true,
          },
        },
        testCaseVersion: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = planCases.map((pc: any) => ({
      ...pc,
      testCase: {
        ...pc.testCase,
        key: `${plan.project.key}-${pc.testCase.caseNumber}`,
      },
    }));

    return {
      planCases: formatted,
      totalCount: formatted.length,
    };
  }

  static async selectPlanCases(
    projectId: string,
    planId: string,
    input: SelectPlanCasesInput,
    userId?: string
  ) {
    const plan = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: { project: { select: { id: true, organizationId: true } } },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    // Fetch all test cases to verify project scope and get their current version snapshot
    const testCases = await prisma.testCase.findMany({
      where: {
        id: { in: input.testCaseIds },
        projectId,
        isArchived: false,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (testCases.length === 0) {
      throw new ValidationError('None of the provided test cases were found in this project');
    }

    // Fetch existing assigned case IDs to prevent duplicate errors
    const existingAssignments = await prisma.testPlanCase.findMany({
      where: {
        testPlanId: planId,
        testCaseId: { in: testCases.map((tc: any) => tc.id) },
      },
      select: { testCaseId: true },
    });

    const existingSet = new Set(existingAssignments.map((e: any) => e.testCaseId));
    const casesToAdd = testCases.filter((tc: any) => !existingSet.has(tc.id));

    if (casesToAdd.length > 0) {
      await prisma.testPlanCase.createMany({
        data: casesToAdd.map((tc: any) => ({
          testPlanId: planId,
          testCaseId: tc.id,
          testCaseVersionId: tc.versions[0]?.id || null, // preserve exact snapshot version
        })),
        skipDuplicates: true,
      });

      await createAuditLog({
        organizationId: plan.project.organizationId,
        userId,
        action: 'TEST_PLAN_CASES_ADDED',
        entityType: 'TestPlan',
        entityId: planId,
        metadata: {
          addedCount: casesToAdd.length,
          caseIds: casesToAdd.map((c: any) => c.id),
        },
      });
    }

    const updatedCases = await this.getPlanCases(projectId, planId);

    return {
      addedCount: casesToAdd.length,
      planCases: updatedCases.planCases,
    };
  }

  static async removePlanCase(
    projectId: string,
    planId: string,
    caseId: string,
    userId?: string
  ) {
    const plan = await prisma.testPlan.findUnique({
      where: { id: planId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!plan || plan.projectId !== projectId) {
      throw new NotFoundError('Test plan not found');
    }

    const assignment = await prisma.testPlanCase.findFirst({
      where: {
        testPlanId: planId,
        testCaseId: caseId,
      },
    });

    if (!assignment) {
      throw new NotFoundError('Test case is not assigned to this test plan');
    }

    await prisma.testPlanCase.delete({
      where: { id: assignment.id },
    });

    await createAuditLog({
      organizationId: plan.project.organizationId,
      userId,
      action: 'TEST_PLAN_CASE_REMOVED',
      entityType: 'TestPlan',
      entityId: planId,
      metadata: { testCaseId: caseId },
    });

    return { message: 'Test case removed from test plan' };
  }
}

export const testPlanService = TestPlanService;
