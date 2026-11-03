import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { CreateTestCaseInput, UpdateTestCaseInput } from '@ai-qa/validation';
import {
  TestPriority,
  TestType,
  TestCaseStatus,
  TestCaseDto,
  VersionDiffDto,
} from '@ai-qa/shared-types';

function toDateString(d: any): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}

export class TestCaseService {
  private async ensureProject(orgId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    return project;
  }

  async getTestCases(
    orgId: string,
    projectId: string,
    params: {
      search?: string;
      suiteId?: string;
      milestoneId?: string;
      priority?: TestPriority;
      type?: TestType;
      status?: TestCaseStatus;
      tag?: string;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const project = await this.ensureProject(orgId, projectId);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
    };

    if (params.isArchived !== undefined) {
      where.isArchived = params.isArchived;
    } else {
      where.isArchived = false;
    }

    if (params.suiteId) {
      where.suiteId = params.suiteId;
    }

    if (params.milestoneId) {
      where.milestoneId = params.milestoneId;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.tag) {
      where.tags = {
        some: {
          name: { equals: params.tag, mode: 'insensitive' },
        },
      };
    }

    if (params.search) {
      const searchNum = parseInt(params.search.replace(/[^0-9]/g, ''), 10);
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { preconditions: { contains: params.search, mode: 'insensitive' } },
        { objectives: { contains: params.search, mode: 'insensitive' } },
        ...(Number.isInteger(searchNum) ? [{ caseNumber: searchNum }] : []),
      ];
    }

    const orderBy: any = {};
    const validSortFields = ['caseNumber', 'title', 'priority', 'type', 'status', 'createdAt', 'updatedAt'];
    const sortBy = validSortFields.includes(params.sortBy || '') ? params.sortBy! : 'caseNumber';
    orderBy[sortBy] = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, testCases] = await Promise.all([
      prisma.testCase.count({ where }),
      prisma.testCase.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          suite: {
            select: { id: true, name: true },
          },
          milestone: {
            select: { id: true, name: true },
          },
          author: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tags: {
            select: { id: true, name: true, color: true, projectId: true, createdAt: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            include: {
              steps: {
                orderBy: { stepNumber: 'asc' },
              },
            },
          },
        },
      }),
    ]);

    const formattedCases: TestCaseDto[] = testCases.map((tc) => {
      const latestVer = tc.versions[0];
      return {
        id: tc.id,
        projectId: tc.projectId,
        suiteId: tc.suiteId,
        milestoneId: tc.milestoneId,
        caseNumber: tc.caseNumber,
        key: `${project.key}-${tc.caseNumber}`,
        title: tc.title,
        description: tc.description,
        preconditions: tc.preconditions,
        objectives: tc.objectives,
        priority: tc.priority as TestPriority,
        type: tc.type as TestType,
        status: tc.status as TestCaseStatus,
        estimatedTimeMin: tc.estimatedTimeMin,
        isArchived: tc.isArchived,
        currentVersion: tc.currentVersion,
        authorId: tc.authorId,
        author: tc.author,
        tags: tc.tags.map((t) => ({
          id: t.id,
          projectId: t.projectId,
          name: t.name,
          color: t.color,
          createdAt: toDateString(t.createdAt),
        })),
        suite: tc.suite,
        milestone: tc.milestone,
        currentVersionDetails: latestVer
          ? {
              id: latestVer.id,
              testCaseId: latestVer.testCaseId,
              versionNumber: latestVer.versionNumber,
              title: latestVer.title,
              description: latestVer.description,
              preconditions: latestVer.preconditions,
              objectives: latestVer.objectives,
              priority: latestVer.priority as TestPriority,
              type: latestVer.type as TestType,
              status: latestVer.status as TestCaseStatus,
              changeSummary: latestVer.changeSummary,
              createdById: latestVer.createdById,
              createdAt: toDateString(latestVer.createdAt),
              steps: (latestVer.steps || []).map((s) => ({
                id: s.id,
                testCaseVersionId: s.testCaseVersionId,
                stepNumber: s.stepNumber,
                action: s.action,
                testData: s.testData,
                expectedResult: s.expectedResult,
              })),
            }
          : undefined,
        createdAt: toDateString(tc.createdAt),
        updatedAt: toDateString(tc.updatedAt),
      };
    });

    return {
      testCases: formattedCases,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTestCaseById(orgId: string, projectId: string, caseId: string) {
    const project = await this.ensureProject(orgId, projectId);

    const tc = await prisma.testCase.findFirst({
      where: {
        id: caseId,
        projectId,
      },
      include: {
        suite: {
          select: { id: true, name: true },
        },
        milestone: {
          select: { id: true, name: true },
        },
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        tags: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!tc) {
      throw new NotFoundError('Test case not found in project');
    }

    const latestVer = tc.versions.find((v) => v.versionNumber === tc.currentVersion) || tc.versions[0];

    const result: TestCaseDto = {
      id: tc.id,
      projectId: tc.projectId,
      suiteId: tc.suiteId,
      milestoneId: tc.milestoneId,
      caseNumber: tc.caseNumber,
      key: `${project.key}-${tc.caseNumber}`,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      objectives: tc.objectives,
      priority: tc.priority as TestPriority,
      type: tc.type as TestType,
      status: tc.status as TestCaseStatus,
      estimatedTimeMin: tc.estimatedTimeMin,
      isArchived: tc.isArchived,
      currentVersion: tc.currentVersion,
      authorId: tc.authorId,
      author: tc.author,
      tags: tc.tags.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        name: t.name,
        color: t.color,
        createdAt: toDateString(t.createdAt),
      })),
      suite: tc.suite,
      milestone: tc.milestone,
      currentVersionDetails: latestVer
        ? {
            id: latestVer.id,
            testCaseId: latestVer.testCaseId,
            versionNumber: latestVer.versionNumber,
            title: latestVer.title,
            description: latestVer.description,
            preconditions: latestVer.preconditions,
            objectives: latestVer.objectives,
            priority: latestVer.priority as TestPriority,
            type: latestVer.type as TestType,
            status: latestVer.status as TestCaseStatus,
            changeSummary: latestVer.changeSummary,
            createdById: latestVer.createdById,
            createdBy: latestVer.createdBy,
            createdAt: toDateString(latestVer.createdAt),
            steps: (latestVer.steps || []).map((s) => ({
              id: s.id,
              testCaseVersionId: s.testCaseVersionId,
              stepNumber: s.stepNumber,
              action: s.action,
              testData: s.testData,
              expectedResult: s.expectedResult,
            })),
          }
        : undefined,
      createdAt: toDateString(tc.createdAt),
      updatedAt: toDateString(tc.updatedAt),
    };

    return result;
  }

  async createTestCase(
    userId: string,
    orgId: string,
    projectId: string,
    input: CreateTestCaseInput,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    if (input.suiteId) {
      const suite = await prisma.testSuite.findFirst({
        where: { id: input.suiteId, projectId },
      });
      if (!suite) {
        throw new NotFoundError('Test suite not found in this project');
      }
    }

    if (input.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: input.milestoneId, projectId },
      });
      if (!milestone) {
        throw new NotFoundError('Milestone not found in this project');
      }
    }

    // Resolve or create tags
    const tagIds: string[] = [];
    if (input.tags && input.tags.length > 0) {
      for (const rawName of input.tags) {
        const name = rawName.trim();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: {
            projectId_name: {
              projectId,
              name,
            },
          },
          create: {
            projectId,
            name,
          },
          update: {},
        });
        tagIds.push(tag.id);
      }
    }

    const testCase = await prisma.$transaction(async (tx) => {
      // Get next case number
      const maxCase = await tx.testCase.findFirst({
        where: { projectId },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
      });
      const caseNumber = (maxCase?.caseNumber || 0) + 1;

      // 1. Create TestCase master record
      const tc = await tx.testCase.create({
        data: {
          projectId,
          suiteId: input.suiteId,
          milestoneId: input.milestoneId,
          caseNumber,
          title: input.title,
          description: input.description,
          preconditions: input.preconditions,
          objectives: input.objectives,
          priority: (input.priority as TestPriority) || TestPriority.MEDIUM,
          type: (input.type as TestType) || TestType.FUNCTIONAL,
          status: (input.status as TestCaseStatus) || TestCaseStatus.ACTIVE,
          estimatedTimeMin: input.estimatedTimeMin,
          currentVersion: 1,
          authorId: userId,
          tags: {
            connect: tagIds.map((id) => ({ id })),
          },
        },
      });

      // 2. Create TestCaseVersion v1
      const version = await tx.testCaseVersion.create({
        data: {
          testCaseId: tc.id,
          versionNumber: 1,
          title: input.title,
          description: input.description,
          preconditions: input.preconditions,
          objectives: input.objectives,
          priority: (input.priority as TestPriority) || TestPriority.MEDIUM,
          type: (input.type as TestType) || TestType.FUNCTIONAL,
          status: (input.status as TestCaseStatus) || TestCaseStatus.ACTIVE,
          changeSummary: 'Initial test case creation',
          createdById: userId,
        },
      });

      // 3. Create steps for version 1
      await tx.testStep.createMany({
        data: input.steps.map((step, idx) => ({
          testCaseVersionId: version.id,
          stepNumber: step.stepNumber || idx + 1,
          action: step.action,
          testData: step.testData,
          expectedResult: step.expectedResult,
        })),
      });

      return tc;
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:create',
      entityType: 'TestCase',
      entityId: testCase.id,
      metadata: {
        key: `${project.key}-${testCase.caseNumber}`,
        title: testCase.title,
        priority: testCase.priority,
        type: testCase.type,
      },
      ipAddress: ip,
      userAgent,
    });

    return this.getTestCaseById(orgId, projectId, testCase.id);
  }

  async updateTestCase(
    userId: string,
    orgId: string,
    projectId: string,
    caseId: string,
    input: UpdateTestCaseInput,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    const existing = await prisma.testCase.findFirst({
      where: { id: caseId, projectId },
      include: {
        tags: true,
        versions: {
          where: { versionNumber: { equals: undefined } },
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Test case not found in project');
    }

    if (input.suiteId) {
      const suite = await prisma.testSuite.findFirst({
        where: { id: input.suiteId, projectId },
      });
      if (!suite) {
        throw new NotFoundError('Target test suite not found in this project');
      }
    }

    if (input.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: input.milestoneId, projectId },
      });
      if (!milestone) {
        throw new NotFoundError('Target milestone not found in this project');
      }
    }

    const latestVersion = existing.versions[0];

    // Determine if content has changed meaningfully to warrant a new version snapshot
    const title = input.title !== undefined ? input.title : existing.title;
    const description = input.description !== undefined ? input.description : existing.description;
    const preconditions = input.preconditions !== undefined ? input.preconditions : existing.preconditions;
    const objectives = input.objectives !== undefined ? input.objectives : existing.objectives;
    const priority = input.priority !== undefined ? (input.priority as TestPriority) : existing.priority;
    const type = input.type !== undefined ? (input.type as TestType) : existing.type;
    const status = input.status !== undefined ? (input.status as TestCaseStatus) : existing.status;

    let stepsChanged = false;
    if (input.steps) {
      if (!latestVersion || input.steps.length !== latestVersion.steps.length) {
        stepsChanged = true;
      } else {
        for (let i = 0; i < input.steps.length; i++) {
          const sNew = input.steps[i];
          const sOld = latestVersion.steps[i];
          if (
            sNew.action !== sOld.action ||
            (sNew.testData || null) !== (sOld.testData || null) ||
            sNew.expectedResult !== sOld.expectedResult ||
            sNew.stepNumber !== sOld.stepNumber
          ) {
            stepsChanged = true;
            break;
          }
        }
      }
    }

    const contentChanged =
      title !== existing.title ||
      description !== existing.description ||
      preconditions !== existing.preconditions ||
      objectives !== existing.objectives ||
      priority !== existing.priority ||
      type !== existing.type ||
      status !== existing.status ||
      stepsChanged;

    // Resolve tags if provided
    let tagConnect: { id: string }[] | undefined;
    if (input.tags !== undefined) {
      const tagIds: string[] = [];
      for (const rawName of input.tags) {
        const name = rawName.trim();
        if (!name) continue;
        const tag = await prisma.tag.upsert({
          where: { projectId_name: { projectId, name } },
          create: { projectId, name },
          update: {},
        });
        tagIds.push(tag.id);
      }
      tagConnect = tagIds.map((id) => ({ id }));
    }

    await prisma.$transaction(async (tx) => {
      let nextVersionNumber = existing.currentVersion;

      if (contentChanged) {
        nextVersionNumber = existing.currentVersion + 1;

        const stepsToSave =
          input.steps ||
          (latestVersion?.steps.map((s) => ({
            stepNumber: s.stepNumber,
            action: s.action,
            testData: s.testData,
            expectedResult: s.expectedResult,
          })) ?? []);

        // Create new immutable TestCaseVersion
        const newVersion = await tx.testCaseVersion.create({
          data: {
            testCaseId: existing.id,
            versionNumber: nextVersionNumber,
            title,
            description,
            preconditions,
            objectives,
            priority,
            type,
            status,
            changeSummary: input.changeSummary || `Updated to version ${nextVersionNumber}`,
            createdById: userId,
          },
        });

        // Create steps snapshot
        await tx.testStep.createMany({
          data: stepsToSave.map((s, idx) => ({
            testCaseVersionId: newVersion.id,
            stepNumber: s.stepNumber || idx + 1,
            action: s.action,
            testData: s.testData,
            expectedResult: s.expectedResult,
          })),
        });
      }

      // Update main TestCase record
      await tx.testCase.update({
        where: { id: caseId },
        data: {
          title,
          description,
          preconditions,
          objectives,
          priority,
          type,
          status,
          estimatedTimeMin:
            input.estimatedTimeMin !== undefined ? input.estimatedTimeMin : existing.estimatedTimeMin,
          suiteId: input.suiteId !== undefined ? input.suiteId : existing.suiteId,
          milestoneId: input.milestoneId !== undefined ? input.milestoneId : existing.milestoneId,
          currentVersion: nextVersionNumber,
          tags: tagConnect
            ? {
                set: tagConnect,
              }
            : undefined,
        },
      });
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:update',
      entityType: 'TestCase',
      entityId: caseId,
      metadata: {
        key: `${project.key}-${existing.caseNumber}`,
        changes: input,
        newVersion: contentChanged ? existing.currentVersion + 1 : existing.currentVersion,
      },
      ipAddress: ip,
      userAgent,
    });

    return this.getTestCaseById(orgId, projectId, caseId);
  }

  async archiveTestCase(
    userId: string,
    orgId: string,
    projectId: string,
    caseId: string,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    const tc = await prisma.testCase.findFirst({
      where: { id: caseId, projectId },
    });

    if (!tc) {
      throw new NotFoundError('Test case not found in project');
    }

    const updated = await prisma.testCase.update({
      where: { id: caseId },
      data: { isArchived: true },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:archive',
      entityType: 'TestCase',
      entityId: caseId,
      metadata: {
        key: `${project.key}-${tc.caseNumber}`,
      },
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async restoreTestCase(
    userId: string,
    orgId: string,
    projectId: string,
    caseId: string,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    const tc = await prisma.testCase.findFirst({
      where: { id: caseId, projectId },
    });

    if (!tc) {
      throw new NotFoundError('Test case not found in project');
    }

    const updated = await prisma.testCase.update({
      where: { id: caseId },
      data: { isArchived: false },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:restore',
      entityType: 'TestCase',
      entityId: caseId,
      metadata: {
        key: `${project.key}-${tc.caseNumber}`,
      },
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async deleteTestCase(
    userId: string,
    orgId: string,
    projectId: string,
    caseId: string,
    ip?: string,
    userAgent?: string
  ) {
    const project = await this.ensureProject(orgId, projectId);

    const tc = await prisma.testCase.findFirst({
      where: { id: caseId, projectId },
    });

    if (!tc) {
      throw new NotFoundError('Test case not found in project');
    }

    // Check if test case or its versions are referenced in test executions
    const referencedRunCase = await prisma.testRunCase.findFirst({
      where: {
        testCaseVersion: {
          testCaseId: caseId,
        },
      },
    });

    if (referencedRunCase) {
      throw new ValidationError(
        'Cannot permanently delete this test case because it has executed test run results. Archive the test case to preserve historical QA audit logs.'
      );
    }

    await prisma.testCase.delete({
      where: { id: caseId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'test_case:delete',
      entityType: 'TestCase',
      entityId: caseId,
      metadata: {
        key: `${project.key}-${tc.caseNumber}`,
        title: tc.title,
      },
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Test case deleted successfully' };
  }

  async getTestCaseVersions(orgId: string, projectId: string, caseId: string) {
    await this.ensureProject(orgId, projectId);

    const tc = await prisma.testCase.findFirst({
      where: { id: caseId, projectId },
    });

    if (!tc) {
      throw new NotFoundError('Test case not found in project');
    }

    const versions = await prisma.testCaseVersion.findMany({
      where: { testCaseId: caseId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    return versions.map((v) => ({
      id: v.id,
      testCaseId: v.testCaseId,
      versionNumber: v.versionNumber,
      title: v.title,
      description: v.description,
      preconditions: v.preconditions,
      objectives: v.objectives,
      priority: v.priority as TestPriority,
      type: v.type as TestType,
      status: v.status as TestCaseStatus,
      changeSummary: v.changeSummary,
      createdById: v.createdById,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
      steps: v.steps.map((s) => ({
        id: s.id,
        testCaseVersionId: s.testCaseVersionId,
        stepNumber: s.stepNumber,
        action: s.action,
        testData: s.testData,
        expectedResult: s.expectedResult,
      })),
    }));
  }

  async getTestCaseVersion(
    orgId: string,
    projectId: string,
    caseId: string,
    versionNumber: number
  ) {
    await this.ensureProject(orgId, projectId);

    const version = await prisma.testCaseVersion.findFirst({
      where: {
        testCaseId: caseId,
        versionNumber,
        testCase: { projectId },
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!version) {
      throw new NotFoundError(`Version ${versionNumber} not found for this test case`);
    }

    return {
      id: version.id,
      testCaseId: version.testCaseId,
      versionNumber: version.versionNumber,
      title: version.title,
      description: version.description,
      preconditions: version.preconditions,
      objectives: version.objectives,
      priority: version.priority as TestPriority,
      type: version.type as TestType,
      status: version.status as TestCaseStatus,
      changeSummary: version.changeSummary,
      createdById: version.createdById,
      createdBy: version.createdBy,
      createdAt: version.createdAt.toISOString(),
      steps: version.steps.map((s) => ({
        id: s.id,
        testCaseVersionId: s.testCaseVersionId,
        stepNumber: s.stepNumber,
        action: s.action,
        testData: s.testData,
        expectedResult: s.expectedResult,
      })),
    };
  }

  async compareVersions(
    orgId: string,
    projectId: string,
    caseId: string,
    v1: number,
    v2: number
  ): Promise<VersionDiffDto> {
    await this.ensureProject(orgId, projectId);

    const [verA, verB] = await Promise.all([
      this.getTestCaseVersion(orgId, projectId, caseId, v1),
      this.getTestCaseVersion(orgId, projectId, caseId, v2),
    ]);

    let stepsChanged = false;
    if (verA.steps.length !== verB.steps.length) {
      stepsChanged = true;
    } else {
      for (let i = 0; i < verA.steps.length; i++) {
        const sA = verA.steps[i];
        const sB = verB.steps[i];
        if (
          sA.action !== sB.action ||
          (sA.testData || null) !== (sB.testData || null) ||
          sA.expectedResult !== sB.expectedResult
        ) {
          stepsChanged = true;
          break;
        }
      }
    }

    return {
      versionA: v1,
      versionB: v2,
      titleChanged: verA.title !== verB.title,
      descriptionChanged: verA.description !== verB.description,
      preconditionsChanged: verA.preconditions !== verB.preconditions,
      objectivesChanged: verA.objectives !== verB.objectives,
      priorityChanged: verA.priority !== verB.priority,
      typeChanged: verA.type !== verB.type,
      statusChanged: verA.status !== verB.status,
      stepsChanged,
      detailsA: verA,
      detailsB: verB,
    };
  }
}

export const testCaseService = new TestCaseService();
