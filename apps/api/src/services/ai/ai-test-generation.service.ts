import { prisma } from '../../prisma';
import {
  AITaskType,
  AIGenerationStatus,
  AIReviewStatus,
  AIGenerationDto,
  AIGenerationItemDto,
  GenerateTestCasesInput,
  ReviewAIGenerationItemInput,
  BatchReviewAIGenerationItemsInput,
  TestPriority,
  TestType,
  TestCaseStatus,
} from '@ai-qa/shared-types';
import { AIGatewayService } from './ai-gateway.service';
import { TestCaseService } from '../test-case.service';
import { sanitizePromptInput, formatPromptBlock } from '../../utils/prompt-sanitizer';
import { NotFoundError, ValidationError } from '../../errors';

export class AITestGenerationService {
  private static testCaseService = new TestCaseService();

  /**
   * Generate structured test cases from requirements or user stories.
   */
  static async generateTestCases(
    projectId: string,
    organizationId: string,
    userId: string,
    input: GenerateTestCasesInput
  ): Promise<AIGenerationDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    if (input.suiteId) {
      const suite = await prisma.testSuite.findFirst({
        where: { id: input.suiteId, projectId },
      });
      if (!suite) {
        throw new NotFoundError('Target test suite not found in this project');
      }
    }

    // Sanitize user inputs to prevent prompt injection and credential leaks
    const sanitizedReq = sanitizePromptInput(input.requirementText);
    const count = Math.min(30, Math.max(1, input.targetCount || 5));

    const edgeOption = input.includeEdgeCases !== false ? 'Include boundary and edge cases.' : '';
    const securityOption = input.includeSecurity !== false ? 'Include security and injection tests.' : '';

    const systemPrompt = `You are an expert Principal QA Automation Engineer.
Your task is to generate rigorous, structured test cases based strictly on user-provided requirements.
${edgeOption}
${securityOption}
You MUST output valid JSON only, without any markdown formatting, preamble, or conversational notes:
{
  "summary": "Brief summary of generated coverage",
  "coverageNotes": "Explanation of test scenarios covered and boundary analysis",
  "testCases": [
    {
      "title": "Clear action-oriented title",
      "description": "Detailed explanation of what is being tested",
      "type": "FUNCTIONAL" | "REGRESSION" | "SMOKE" | "SECURITY" | "PERFORMANCE",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "preconditions": "Prerequisite state or auth",
      "steps": [
        {
          "stepNumber": 1,
          "action": "Action to perform",
          "testData": "Input parameters or payload",
          "expectedResult": "Immediate step observation"
        }
      ],
      "expectedResult": "Final expected state",
      "scenarioType": "POSITIVE" | "NEGATIVE" | "BOUNDARY" | "EDGE" | "SECURITY" | "ACCESSIBILITY",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

    let userPrompt = `Please generate exactly ${count} test cases for the following requirement.\n\n`;
    userPrompt += formatPromptBlock('REQUIREMENTS', sanitizedReq.sanitized);

    const aiRes = await AIGatewayService.executeCompletion({
      organizationId,
      projectId,
      userId,
      taskType: AITaskType.TEST_GENERATION,
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json',
      temperature: 0.2,
      maxTokens: 3000,
    });

    let parsedOutput: any;
    try {
      const cleanedJson = aiRes.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsedOutput = JSON.parse(cleanedJson);
    } catch (parseErr: any) {
      throw new ValidationError(`Failed to parse AI structured response: ${parseErr.message}`);
    }

    const generatedCases = Array.isArray(parsedOutput.testCases) ? parsedOutput.testCases : [];
    if (generatedCases.length === 0) {
      throw new ValidationError('AI returned empty test case list');
    }

    // Persist generation record
    const generation = await prisma.aIGeneration.create({
      data: {
        projectId,
        organizationId,
        userId,
        taskType: AITaskType.TEST_GENERATION,
        provider: 'MOCK',
        modelName: aiRes.model,
        promptInput: userPrompt,
        rawOutput: aiRes.content,
        structuredOutput: parsedOutput,
        status: AIGenerationStatus.COMPLETED,
        tokenPrompt: aiRes.promptTokens,
        tokenCompletion: aiRes.completionTokens,
        tokenCount: aiRes.totalTokens,
        estimatedCost: aiRes.costUsd,
        latencyMs: aiRes.latencyMs,
      },
    });

    // Create item proposals for mandatory human review
    const items = await Promise.all(
      generatedCases.map((tc: any) =>
        prisma.aIGenerationItem.create({
          data: {
            generationId: generation.id,
            itemType: 'TEST_CASE',
            title: tc.title || 'Untitled Test Case',
            content: {
              ...tc,
              suiteId: input.suiteId || null,
            },
            reviewStatus: AIReviewStatus.PROPOSED,
            isApproved: false,
            isRejected: false,
          },
        })
      )
    );

    // Save automated evaluation telemetry safely
    try {
      await prisma.aIEvaluation.create({
        data: {
          generationId: generation.id,
          schemaValid: true,
          requirementCoverage: Math.min(1.0, Number((generatedCases.length / count).toFixed(2))),
          hallucinationFlag: sanitizedReq.injectionDetected,
          acceptanceRate: 0.0,
        },
      });
    } catch {}

    return this.mapToGenerationDto(generation, items);
  }

  /**
   * Get single generation record with its items
   */
  static async getGeneration(
    projectId: string,
    organizationId: string,
    generationId: string
  ): Promise<AIGenerationDto> {
    const generation = await prisma.aIGeneration.findFirst({
      where: {
        id: generationId,
        projectId,
        organizationId,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!generation) {
      throw new NotFoundError('AI Generation record not found');
    }

    return this.mapToGenerationDto(generation, generation.items);
  }

  /**
   * List generations for a project
   */
  static async listGenerations(
    projectId: string,
    organizationId: string,
    taskType?: AITaskType
  ): Promise<AIGenerationDto[]> {
    const where: any = { projectId, organizationId };
    if (taskType) {
      where.taskType = taskType;
    }

    const generations = await prisma.aIGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: true,
      },
    });

    return generations.map((g) => this.mapToGenerationDto(g, g.items));
  }

  /**
   * Review a single generated item (ACCEPTED / MODIFIED / REJECTED)
   */
  static async reviewItem(
    projectId: string,
    organizationId: string,
    itemId: string,
    userId: string,
    input: ReviewAIGenerationItemInput
  ): Promise<AIGenerationItemDto> {
    const item = await prisma.aIGenerationItem.findFirst({
      where: { id: itemId },
      include: {
        generation: true,
      },
    });

    if (!item || item.generation.projectId !== projectId || item.generation.organizationId !== organizationId) {
      throw new NotFoundError('Generation item not found');
    }

    if (item.reviewStatus !== AIReviewStatus.PROPOSED) {
      throw new ValidationError(`Item has already been reviewed with status ${item.reviewStatus}`);
    }

    let persistedTestCaseId: string | undefined = undefined;
    const content = (item.content as any) || {};

    if (input.reviewStatus === AIReviewStatus.ACCEPTED || input.reviewStatus === AIReviewStatus.MODIFIED) {
      const tcProposal = input.modifiedContent || content;
      const tcTitle = tcProposal.title?.trim() || item.title;
      const tcDesc = tcProposal.description || content.description || '';
      const tcPrecond = tcProposal.preconditions || content.preconditions || null;
      const tcType = (tcProposal.type || content.type || 'FUNCTIONAL') as TestType;
      const tcPriority = (tcProposal.priority || content.priority || 'MEDIUM') as TestPriority;
      const tcSuiteId = input.suiteId || content.suiteId || null;

      // Extract steps
      const rawSteps = tcProposal.steps || content.steps || [];
      const steps = (rawSteps.length > 0 ? rawSteps : [
        {
          stepNumber: 1,
          action: 'Perform verification action according to specification',
          testData: '',
          expectedResult: 'System responds as expected',
        },
      ]).map((s: any, idx: number) => ({
        stepNumber: s.stepNumber || idx + 1,
        action: s.action || 'Execute step',
        testData: s.testData || undefined,
        expectedResult: s.expectedResult || 'Step succeeds',
      }));

      // Commit to official TestCase using TestCaseService
      const newCase = await this.testCaseService.createTestCase(
        userId,
        organizationId,
        projectId,
        {
          title: tcTitle,
          description: tcDesc,
          preconditions: tcPrecond,
          type: tcType,
          priority: tcPriority,
          status: TestCaseStatus.ACTIVE,
          suiteId: tcSuiteId,
          tags: Array.isArray(content.tags) ? content.tags : ['ai-generated'],
          steps,
        }
      );

      persistedTestCaseId = newCase.id;
    }

    const isApproved = input.reviewStatus === AIReviewStatus.ACCEPTED || input.reviewStatus === AIReviewStatus.MODIFIED;
    const isRejected = input.reviewStatus === AIReviewStatus.REJECTED;

    const updated = await prisma.aIGenerationItem.update({
      where: { id: itemId },
      data: {
        title: input.modifiedContent?.title?.trim() || item.title,
        content: input.modifiedContent ? { ...content, ...input.modifiedContent } : item.content,
        reviewStatus: input.reviewStatus,
        isApproved,
        isRejected,
        rejectionReason: input.rejectionReason || null,
        reviewedById: userId,
        reviewedAt: new Date(),
        persistedTestCaseId: persistedTestCaseId || null,
      },
    });

    return this.mapToItemDto(updated);
  }

  /**
   * Batch review generated items
   */
  static async batchReview(
    projectId: string,
    organizationId: string,
    userId: string,
    input: BatchReviewAIGenerationItemsInput
  ): Promise<{ reviewedCount: number; results: AIGenerationItemDto[] }> {
    const results: AIGenerationItemDto[] = [];

    const targetStatus = input.action === 'ACCEPT' ? AIReviewStatus.ACCEPTED : AIReviewStatus.REJECTED;

    for (const itemId of input.itemIds) {
      const res = await this.reviewItem(projectId, organizationId, itemId, userId, {
        reviewStatus: targetStatus,
        suiteId: input.targetSuiteId,
      });
      results.push(res);
    }

    return {
      reviewedCount: results.length,
      results,
    };
  }

  private static mapToGenerationDto(g: any, items: any[] = []): AIGenerationDto {
    return {
      id: g.id,
      projectId: g.projectId,
      organizationId: g.organizationId,
      userId: g.userId,
      taskType: g.taskType as AITaskType,
      provider: g.provider,
      modelName: g.modelName,
      promptTemplateId: g.promptTemplateId || null,
      promptVersion: g.promptVersion || null,
      promptInput: g.promptInput,
      rawOutput: g.rawOutput || null,
      structuredOutput: g.structuredOutput || null,
      status: g.status as AIGenerationStatus,
      errorMessage: g.errorMessage || null,
      tokenPrompt: g.tokenPrompt,
      tokenCompletion: g.tokenCompletion,
      tokenCount: g.tokenCount,
      estimatedCost: g.estimatedCost,
      latencyMs: g.latencyMs,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      items: items.map((i) => this.mapToItemDto(i)),
    };
  }

  private static mapToItemDto(i: any): AIGenerationItemDto {
    return {
      id: i.id,
      generationId: i.generationId,
      itemType: i.itemType,
      title: i.title,
      content: i.content,
      reviewStatus: i.reviewStatus as AIReviewStatus,
      isApproved: i.isApproved,
      isRejected: i.isRejected,
      reviewedById: i.reviewedById || null,
      reviewedAt: i.reviewedAt ? i.reviewedAt.toISOString() : null,
      persistedTestCaseId: i.persistedTestCaseId || null,
      rejectionReason: i.rejectionReason || null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}
