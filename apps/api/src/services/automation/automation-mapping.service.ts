import { prisma } from '../../prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../../errors.js';
import {
  AutomationFramework,
  AutomationTestMappingDto,
  AutomationUnmappedTestDto,
  CreateAutomationMappingInput,
  UpdateAutomationMappingInput,
  ResolveUnmappedTestInput,
} from '@ai-qa/shared-types';

export class AutomationMappingService {
  /**
   * List all test mappings for a project.
   */
  async listMappings(
    projectId: string,
    params: { framework?: string; search?: string; page?: number; limit?: number } = {}
  ): Promise<{ mappings: AutomationTestMappingDto[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (params.framework) {
      where.framework = params.framework;
    }
    if (params.search) {
      where.OR = [
        { externalId: { contains: params.search, mode: 'insensitive' } },
        { externalTitle: { contains: params.search, mode: 'insensitive' } },
        { testCase: { title: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [mappings, total] = await Promise.all([
      prisma.automationTestMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          testCase: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              project: {
                select: { key: true },
              },
            },
          },
        },
      }),
      prisma.automationTestMapping.count({ where }),
    ]);

    return {
      mappings: mappings.map((m) => this.mapToDto(m)),
      total,
    };
  }

  /**
   * Create an explicit test mapping.
   */
  async createMapping(
    projectId: string,
    input: CreateAutomationMappingInput
  ): Promise<AutomationTestMappingDto> {
    if (!input.testCaseId || !input.externalId) {
      throw new ValidationError('testCaseId and externalId are required');
    }

    // Verify test case belongs to project
    const testCase = await prisma.testCase.findFirst({
      where: { id: input.testCaseId, projectId },
      include: {
        project: { select: { key: true } },
      },
    });

    if (!testCase) {
      throw new NotFoundError('Target TestCase not found in this project');
    }

    // Check uniqueness of externalId within project
    const existing = await prisma.automationTestMapping.findUnique({
      where: {
        projectId_externalId: {
          projectId,
          externalId: input.externalId,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `External test '${input.externalId}' is already mapped in this project`
      );
    }

    const mapping = await prisma.automationTestMapping.create({
      data: {
        projectId,
        testCaseId: input.testCaseId,
        externalId: input.externalId.trim(),
        externalTitle: input.externalTitle?.trim() || input.externalId.trim(),
        framework: input.framework || 'PLAYWRIGHT',
        confidence: 1.0,
        isVerified: true,
      },
      include: {
        testCase: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            project: {
              select: { key: true },
            },
          },
        },
      },
    });

    // If there were any unmapped entries with this externalId, mark them RESOLVED
    await prisma.automationUnmappedTest.updateMany({
      where: { projectId, externalId: input.externalId },
      data: {
        status: 'RESOLVED',
        resolvedTestCaseId: input.testCaseId,
      },
    });

    return this.mapToDto(mapping);
  }

  /**
   * Update an existing test mapping.
   */
  async updateMapping(
    projectId: string,
    mappingId: string,
    input: UpdateAutomationMappingInput
  ): Promise<AutomationTestMappingDto> {
    const existing = await prisma.automationTestMapping.findFirst({
      where: { id: mappingId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Test mapping not found in this project');
    }

    if (input.testCaseId && input.testCaseId !== existing.testCaseId) {
      const tc = await prisma.testCase.findFirst({
        where: { id: input.testCaseId, projectId },
      });
      if (!tc) {
        throw new NotFoundError('Target TestCase not found in this project');
      }
    }

    const updated = await prisma.automationTestMapping.update({
      where: { id: mappingId },
      data: {
        ...(input.testCaseId ? { testCaseId: input.testCaseId } : {}),
        ...(input.externalTitle ? { externalTitle: input.externalTitle.trim() } : {}),
        ...(typeof input.isVerified === 'boolean' ? { isVerified: input.isVerified } : {}),
      },
      include: {
        testCase: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            project: {
              select: { key: true },
            },
          },
        },
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Delete a test mapping.
   */
  async deleteMapping(projectId: string, mappingId: string): Promise<void> {
    const existing = await prisma.automationTestMapping.findFirst({
      where: { id: mappingId, projectId },
    });

    if (!existing) {
      throw new NotFoundError('Test mapping not found in this project');
    }

    await prisma.automationTestMapping.delete({
      where: { id: mappingId },
    });
  }

  /**
   * Resolve an external test run result to a platform TestCase ID.
   * Priority:
   * 1. Explicit TestCase ID / key passed in result metadata (e.g. "CORE-101", "101", UUID)
   * 2. Direct mapping lookup in `AutomationTestMapping` by `externalId`
   * 3. Fallback mapping lookup by `externalTitle`
   */
  async resolveExternalTest(
    projectId: string,
    externalId: string,
    externalTitle: string,
    explicitCandidate?: string | null
  ): Promise<{ testCaseId: string | null; isExplicit: boolean; confidence: number }> {
    // 1. Check explicit candidate annotation
    if (explicitCandidate && explicitCandidate.trim().length > 0) {
      const candidate = explicitCandidate.trim();

      // Check if candidate is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(candidate)) {
        const tc = await prisma.testCase.findFirst({
          where: { id: candidate, projectId },
          select: { id: true },
        });
        if (tc) {
          return { testCaseId: tc.id, isExplicit: true, confidence: 1.0 };
        }
      }

      // Check if candidate is project key + number (e.g. "CORE-101" or "TC-101") or purely digits "101"
      const numberMatch = candidate.match(/(?:[A-Z0-9]+-)?(\d+)/i);
      if (numberMatch && numberMatch[1]) {
        const caseNumber = parseInt(numberMatch[1], 10);
        const tc = await prisma.testCase.findFirst({
          where: { projectId, caseNumber },
          select: { id: true },
        });
        if (tc) {
          return { testCaseId: tc.id, isExplicit: true, confidence: 1.0 };
        }
      }
    }

    // Also check if externalId or externalTitle contains an embedded tag like `@AIQA-101` or `[TC-101]`
    const combined = `${externalId} ${externalTitle}`;
    const tagMatch = combined.match(/@?(?:AIQA|TC|TEST)-?(\d+)/i);
    if (tagMatch && tagMatch[1]) {
      const caseNumber = parseInt(tagMatch[1], 10);
      const tc = await prisma.testCase.findFirst({
        where: { projectId, caseNumber },
        select: { id: true },
      });
      if (tc) {
        return { testCaseId: tc.id, isExplicit: true, confidence: 1.0 };
      }
    }

    // 2. Exact match in AutomationTestMapping by externalId
    const mapping = await prisma.automationTestMapping.findUnique({
      where: {
        projectId_externalId: {
          projectId,
          externalId,
        },
      },
      select: { testCaseId: true, confidence: true },
    });

    if (mapping) {
      return {
        testCaseId: mapping.testCaseId,
        isExplicit: false,
        confidence: mapping.confidence,
      };
    }

    // 3. Fallback match by exact externalTitle
    if (externalTitle && externalTitle !== externalId) {
      const titleMapping = await prisma.automationTestMapping.findFirst({
        where: { projectId, externalTitle },
        select: { testCaseId: true, confidence: true },
      });
      if (titleMapping) {
        return {
          testCaseId: titleMapping.testCaseId,
          isExplicit: false,
          confidence: titleMapping.confidence * 0.95,
        };
      }
    }

    return { testCaseId: null, isExplicit: false, confidence: 0 };
  }

  /**
   * Record an unmapped automated test during session ingestion.
   */
  async recordUnmappedTest(
    projectId: string,
    sessionId: string,
    externalId: string,
    externalTitle: string,
    suiteName: string | null,
    framework: string
  ): Promise<void> {
    const existing = await prisma.automationUnmappedTest.findFirst({
      where: { projectId, externalId },
    });

    if (existing) {
      await prisma.automationUnmappedTest.update({
        where: { id: existing.id },
        data: {
          sessionId,
          externalTitle,
          suiteName: suiteName || existing.suiteName,
          lastSeenAt: new Date(),
        },
      });
    } else {
      await prisma.automationUnmappedTest.create({
        data: {
          projectId,
          sessionId,
          externalId,
          externalTitle,
          suiteName,
          framework,
          status: 'PENDING',
        },
      });
    }
  }

  /**
   * List unmapped tests for a project.
   */
  async listUnmappedTests(
    projectId: string,
    params: { sessionId?: string; status?: string; page?: number; limit?: number } = {}
  ): Promise<{ unmapped: AutomationUnmappedTestDto[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (params.sessionId) {
      where.sessionId = params.sessionId;
    }
    if (params.status) {
      where.status = params.status;
    }

    const [unmapped, total] = await Promise.all([
      prisma.automationUnmappedTest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
      }),
      prisma.automationUnmappedTest.count({ where }),
    ]);

    return {
      unmapped: unmapped.map((u) => ({
        id: u.id,
        sessionId: u.sessionId,
        projectId: u.projectId,
        externalId: u.externalId,
        externalTitle: u.externalTitle,
        suiteName: u.suiteName,
        framework: u.framework as AutomationFramework,
        lastSeenAt: u.lastSeenAt.toISOString(),
        status: u.status as 'PENDING' | 'RESOLVED' | 'IGNORED',
        resolvedTestCaseId: u.resolvedTestCaseId,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Resolve an unmapped test by either linking to an existing TestCase or creating one.
   */
  async resolveUnmappedTest(
    projectId: string,
    unmappedId: string,
    input: ResolveUnmappedTestInput
  ): Promise<AutomationTestMappingDto | { status: string }> {
    const unmapped = await prisma.automationUnmappedTest.findFirst({
      where: { id: unmappedId, projectId },
    });

    if (!unmapped) {
      throw new NotFoundError('Unmapped test record not found');
    }

    if (input.status === 'IGNORED') {
      await prisma.automationUnmappedTest.update({
        where: { id: unmappedId },
        data: { status: 'IGNORED' },
      });
      return { status: 'IGNORED' };
    }

    let targetTestCaseId = input.testCaseId;

    // If createTestCase is true and no existing testCaseId provided, create a new TestCase
    if (input.createTestCase && !targetTestCaseId) {
      const highestCase = await prisma.testCase.findFirst({
        where: { projectId },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
      });
      const nextNumber = (highestCase?.caseNumber || 0) + 1;

      const newCase = await prisma.testCase.create({
        data: {
          projectId,
          caseNumber: nextNumber,
          title: unmapped.externalTitle || unmapped.externalId,
          description: `Imported automated test from ${unmapped.framework}`,
          priority: 'MEDIUM',
          type: 'FUNCTIONAL',
          status: 'ACTIVE',
          versions: {
            create: {
              versionNumber: 1,
              title: unmapped.externalTitle || unmapped.externalId,
              priority: 'MEDIUM',
              type: 'FUNCTIONAL',
            },
          },
        },
      });
      targetTestCaseId = newCase.id;
    }

    if (!targetTestCaseId) {
      throw new ValidationError('A target testCaseId or createTestCase=true is required');
    }

    // Create the mapping
    const mapping = await this.createMapping(projectId, {
      testCaseId: targetTestCaseId,
      externalId: unmapped.externalId,
      externalTitle: unmapped.externalTitle,
      framework: unmapped.framework as AutomationFramework,
    });

    return mapping;
  }

  private mapToDto(m: any): AutomationTestMappingDto {
    const key = m.testCase?.project?.key
      ? `${m.testCase.project.key}-${m.testCase.caseNumber}`
      : undefined;

    return {
      id: m.id,
      projectId: m.projectId,
      testCaseId: m.testCaseId,
      externalId: m.externalId,
      externalTitle: m.externalTitle,
      framework: m.framework as AutomationFramework,
      confidence: m.confidence,
      isVerified: m.isVerified,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      testCase: m.testCase
        ? {
            id: m.testCase.id,
            caseNumber: m.testCase.caseNumber,
            title: m.testCase.title,
            key,
          }
        : undefined,
    };
  }
}

export const automationMappingService = new AutomationMappingService();
