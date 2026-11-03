import { prisma } from '../prisma.js';
import { createAuditLog } from './audit.service.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { CreateTestSuiteInput, UpdateTestSuiteInput } from '@ai-qa/validation';
import { TestSuiteDto } from '@ai-qa/shared-types';

export class TestSuiteService {
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

  async getSuites(orgId: string, projectId: string) {
    await this.ensureProject(orgId, projectId);

    const suites = await prisma.testSuite.findMany({
      where: { projectId },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            testCases: true,
            children: true,
          },
        },
      },
    });

    // Build hierarchical tree
    const suiteMap = new Map<string, TestSuiteDto & { children: TestSuiteDto[] }>();
    const rootSuites: TestSuiteDto[] = [];

    // First initialize map
    for (const s of suites) {
      suiteMap.set(s.id, {
        id: s.id,
        projectId: s.projectId,
        parentId: s.parentId,
        name: s.name,
        description: s.description,
        objectives: s.objectives,
        orderIndex: s.orderIndex,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        children: [],
        _count: s._count,
      });
    }

    // Now establish parent-child links
    for (const s of suites) {
      const node = suiteMap.get(s.id)!;
      if (s.parentId && suiteMap.has(s.parentId)) {
        const parent = suiteMap.get(s.parentId)!;
        parent.children.push(node);
      } else {
        rootSuites.push(node);
      }
    }

    return rootSuites;
  }

  async getSuiteById(orgId: string, projectId: string, suiteId: string) {
    await this.ensureProject(orgId, projectId);

    const suite = await prisma.testSuite.findFirst({
      where: {
        id: suiteId,
        projectId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
          include: {
            _count: {
              select: {
                testCases: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            testCases: true,
            children: true,
          },
        },
      },
    });

    if (!suite) {
      throw new NotFoundError('Test suite not found in project');
    }

    return suite;
  }

  async createSuite(
    userId: string,
    orgId: string,
    projectId: string,
    input: CreateTestSuiteInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    if (input.parentId) {
      const parent = await prisma.testSuite.findFirst({
        where: { id: input.parentId, projectId },
      });
      if (!parent) {
        throw new NotFoundError('Parent test suite not found in this project');
      }
    }

    const suite = await prisma.testSuite.create({
      data: {
        projectId,
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        parentId: input.parentId,
        orderIndex: input.orderIndex ?? 0,
      },
      include: {
        _count: {
          select: {
            testCases: true,
            children: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'suite:create',
      entityType: 'TestSuite',
      entityId: suite.id,
      metadata: {
        name: suite.name,
        projectId,
        parentId: suite.parentId,
      },
      ipAddress: ip,
      userAgent,
    });

    return suite;
  }

  async updateSuite(
    userId: string,
    orgId: string,
    projectId: string,
    suiteId: string,
    input: UpdateTestSuiteInput,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.testSuite.findFirst({
      where: { id: suiteId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Test suite not found in project');
    }

    // Circular reference validation
    if (input.parentId !== undefined) {
      if (input.parentId === suiteId) {
        throw new ValidationError('A test suite cannot be its own parent');
      }

      if (input.parentId !== null) {
        // Ensure parent exists in same project
        const parent = await prisma.testSuite.findFirst({
          where: { id: input.parentId, projectId },
        });

        if (!parent) {
          throw new NotFoundError('Target parent test suite not found in this project');
        }

        // Traverse upwards from target parent to root. If suiteId is found, circular hierarchy detected!
        let currentParentId: string | null = input.parentId;
        while (currentParentId) {
          if (currentParentId === suiteId) {
            throw new ValidationError(
              'Cannot move test suite into its own descendant (circular reference detected)'
            );
          }
          const ancestor: { parentId: string | null } | null = await prisma.testSuite.findUnique({
            where: { id: currentParentId },
            select: { parentId: true },
          });
          currentParentId = ancestor?.parentId || null;
        }
      }
    }

    const updated = await prisma.testSuite.update({
      where: { id: suiteId },
      data: {
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        parentId: input.parentId,
        orderIndex: input.orderIndex,
      },
      include: {
        _count: {
          select: {
            testCases: true,
            children: true,
          },
        },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'suite:update',
      entityType: 'TestSuite',
      entityId: suiteId,
      metadata: {
        changes: input,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return updated;
  }

  async deleteSuite(
    userId: string,
    orgId: string,
    projectId: string,
    suiteId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.ensureProject(orgId, projectId);

    const existing = await prisma.testSuite.findFirst({
      where: { id: suiteId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Test suite not found in project');
    }

    await prisma.testSuite.delete({
      where: { id: suiteId },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'suite:delete',
      entityType: 'TestSuite',
      entityId: suiteId,
      metadata: {
        name: existing.name,
        projectId,
      },
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Test suite deleted successfully' };
  }
}

export const testSuiteService = new TestSuiteService();
