import { prisma } from '../../prisma';
import {
  AITaskType,
  AIGenerationStatus,
  AIFailureAnalysisDto,
  AnalyzeFailureInput,
  DefectSeverity,
  DefectPriority,
} from '@ai-qa/shared-types';
import { AIGatewayService } from './ai-gateway.service';
import { sanitizePromptInput, formatPromptBlock } from '../../utils/prompt-sanitizer';
import { NotFoundError } from '../../errors';

export class AIFailureAnalysisService {
  /**
   * Analyze failed test execution, distinguishing observed facts from root cause hypotheses.
   */
  static async analyzeFailure(
    projectId: string,
    organizationId: string,
    userId: string,
    input: AnalyzeFailureInput
  ): Promise<AIFailureAnalysisDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    // Retrieve test result record
    const result = await prisma.testResult.findFirst({
      where: { id: input.testResultId },
      include: {
        testRunCase: {
          include: {
            testRun: true,
            testCaseVersion: {
              include: {
                steps: { orderBy: { stepNumber: 'asc' } },
                testCase: true,
              },
            },
          },
        },
        stepResults: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!result || result.testRunCase.testRun.projectId !== projectId) {
      throw new NotFoundError('Test execution result not found in this project');
    }

    const testCase = result.testRunCase.testCaseVersion.testCase;
    const steps = result.testRunCase.testCaseVersion.steps;

    // Gather execution facts
    const facts: string[] = [
      `Test Case: ${testCase.title} (Key: ${project.key}-${testCase.caseNumber})`,
      `Execution Status: ${result.status}`,
      `Execution Duration: ${result.durationMs || 0}ms`,
    ];

    if (result.actualResult) {
      facts.push(`Observed Actual Result: ${result.actualResult}`);
    }

    if (result.failureReason) {
      facts.push(`Failure Reason: ${result.failureReason}`);
    }

    for (const sr of result.stepResults) {
      if (sr.status === 'FAILED') {
        const stepDef = steps.find((s) => s.stepNumber === sr.stepNumber);
        facts.push(
          `Failed Step ${sr.stepNumber}: Action "${stepDef?.action || ''}" | Expected: "${stepDef?.expectedResult || ''}" | Actual: "${sr.actualResult || 'Failed'}"`
        );
      }
    }

    const systemPrompt = `You are an expert AI Principal QA Debugging Engineer.
Your task is to analyze test execution failures and extract root-cause diagnostics.
You MUST strictly separate:
1. Observed Facts (directly observable in the logs, error messages, or step results)
2. Hypotheses (probable root causes with probability and confidence score)

You MUST output valid JSON only, without markdown fences or conversational preambles:
{
  "summary": "Clear, actionable failure summary",
  "observedFacts": ["fact 1", "fact 2"],
  "hypotheses": [
    {
      "title": "Hypothesis title",
      "probability": "HIGH" | "MEDIUM" | "LOW",
      "confidence": 0.85,
      "explanation": "Technical explanation of the potential root cause"
    }
  ],
  "suggestedDebuggingSteps": ["step 1", "step 2"],
  "affectedComponents": ["Component A", "Component B"],
  "suggestedSeverity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "suggestedPriority": "URGENT" | "HIGH" | "MEDIUM" | "LOW"
}`;

    let userPrompt = `Please analyze the following test failure and diagnose the root cause:\n\n`;
    userPrompt += formatPromptBlock('OBSERVED_EXECUTION_FACTS', facts.join('\n'));

    if (input.additionalLogs) {
      const sanitizedLogs = sanitizePromptInput(input.additionalLogs).sanitized;
      userPrompt += '\n\n' + formatPromptBlock('ADDITIONAL_LOGS', sanitizedLogs);
    }

    const aiRes = await AIGatewayService.executeCompletion({
      organizationId,
      projectId,
      userId,
      taskType: AITaskType.FAILURE_ANALYSIS,
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json',
      temperature: 0.1,
      maxTokens: 2500,
    });

    let parsed: any;
    try {
      const cleaned = aiRes.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: `Failure in ${testCase.title}`,
        observedFacts: facts,
        hypotheses: [
          {
            title: 'Unexpected runtime assertion or timeout',
            probability: 'HIGH',
            confidence: 0.8,
            explanation: 'Step execution deviated from expected behavior.',
          },
        ],
        suggestedDebuggingSteps: ['Inspect execution logs and verify test environment data'],
        affectedComponents: ['Core API'],
        suggestedSeverity: 'HIGH',
        suggestedPriority: 'HIGH',
      };
    }

    // Persist generation record
    const generation = await prisma.aIGeneration.create({
      data: {
        projectId,
        organizationId,
        userId,
        taskType: AITaskType.FAILURE_ANALYSIS,
        provider: 'MOCK',
        modelName: aiRes.model,
        promptInput: userPrompt,
        rawOutput: aiRes.content,
        structuredOutput: parsed,
        status: AIGenerationStatus.COMPLETED,
        tokenPrompt: aiRes.promptTokens,
        tokenCompletion: aiRes.completionTokens,
        tokenCount: aiRes.totalTokens,
        estimatedCost: aiRes.costUsd,
        latencyMs: aiRes.latencyMs,
      },
    });

    // Persist analysis result
    await prisma.aIAnalysisResult.create({
      data: {
        generationId: generation.id,
        targetType: 'TEST_FAILURE',
        targetId: input.testResultId,
        summary: parsed.summary || 'Failure Analysis Result',
        rootCause: parsed.hypotheses?.[0]?.explanation || null,
        observedFacts: parsed.observedFacts || facts,
        hypotheses: parsed.hypotheses || [],
        confidence: parsed.hypotheses?.[0]?.confidence || 0.85,
        recommendations: parsed.suggestedDebuggingSteps || [],
        suggestedSeverity: (parsed.suggestedSeverity as DefectSeverity) || DefectSeverity.HIGH,
        suggestedPriority: (parsed.suggestedPriority as DefectPriority) || DefectPriority.HIGH,
      },
    });

    return {
      summary: parsed.summary || `Failure in ${testCase.title}`,
      observedFacts: Array.isArray(parsed.observedFacts) ? parsed.observedFacts : facts,
      hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses : [],
      suggestedDebuggingSteps: Array.isArray(parsed.suggestedDebuggingSteps) ? parsed.suggestedDebuggingSteps : [],
      affectedComponents: Array.isArray(parsed.affectedComponents) ? parsed.affectedComponents : ['Core API'],
      suggestedSeverity: (parsed.suggestedSeverity as DefectSeverity) || DefectSeverity.HIGH,
      suggestedPriority: (parsed.suggestedPriority as DefectPriority) || DefectPriority.HIGH,
    };
  }
}
