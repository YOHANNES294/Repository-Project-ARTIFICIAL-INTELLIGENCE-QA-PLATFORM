import { prisma } from '../../prisma';
import {
  AITaskType,
  AIGenerationStatus,
  AIRiskAnalysisDto,
  AnalyzeRiskInput,
  DefectSeverity,
  DefectStatus,
} from '@ai-qa/shared-types';
import { AIGatewayService } from './ai-gateway.service';
import { formatPromptBlock } from '../../utils/prompt-sanitizer';
import { NotFoundError } from '../../errors';

export class AIRiskAnalysisService {
  /**
   * Calculate explainable risk scores and recommended test focus using real project metrics.
   */
  static async analyzeRisk(
    projectId: string,
    organizationId: string,
    userId: string,
    input: AnalyzeRiskInput
  ): Promise<AIRiskAnalysisDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    // 1. Gather real defect metrics
    const openDefects = await prisma.defect.findMany({
      where: {
        projectId,
        ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
        ...(input.environmentId ? { environmentId: input.environmentId } : {}),
        status: { in: [DefectStatus.NEW, DefectStatus.OPEN, DefectStatus.IN_PROGRESS, DefectStatus.REOPENED] },
      },
      select: {
        id: true,
        severity: true,
        title: true,
        component: true,
      },
    });

    const criticalCount = openDefects.filter((d) => d.severity === DefectSeverity.CRITICAL).length;
    const highCount = openDefects.filter((d) => d.severity === DefectSeverity.HIGH).length;
    const mediumCount = openDefects.filter((d) => d.severity === DefectSeverity.MEDIUM).length;
    const lowCount = openDefects.filter((d) => d.severity === DefectSeverity.LOW).length;

    // 2. Gather real test execution metrics
    const testRuns = await prisma.testRun.findMany({
      where: {
        projectId,
        ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
        ...(input.environmentId ? { environmentId: input.environmentId } : {}),
      },
      include: {
        cases: {
          select: { status: true },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    let totalExecutions = 0;
    let failedExecutions = 0;
    let passedExecutions = 0;

    for (const run of testRuns) {
      for (const rc of run.cases) {
        totalExecutions++;
        if (rc.status === 'FAILED') failedExecutions++;
        if (rc.status === 'PASSED') passedExecutions++;
      }
    }

    const failureRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

    // Formulate real metric payload
    const metricsSummary = [
      `Total Executed Test Cases (Recent): ${totalExecutions}`,
      `Passed: ${passedExecutions} | Failed: ${failedExecutions}`,
      `Failure Rate: ${failureRate.toFixed(1)}%`,
      `Open Critical Defects: ${criticalCount}`,
      `Open High Defects: ${highCount}`,
      `Open Medium Defects: ${mediumCount}`,
      `Open Low Defects: ${lowCount}`,
    ].join('\n');

    const systemPrompt = `You are an expert AI Principal QA Director and Risk Analyst.
Your task is to analyze project QA metrics and synthesize an explainable risk assessment.
You MUST output valid JSON only, without markdown code fences or conversational preamble:
{
  "overallRiskScore": number (0 to 100),
  "riskCategory": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "Concise summary of the project risk posture",
  "contributingFactors": [
    { "factor": "Factor name", "impact": "High / Medium / Low impact description", "weight": 0.4 }
  ],
  "recommendedTestFocus": [
    {
      "area": "Module or flow name",
      "suggestedAction": "Specific testing action",
      "testCasesCount": 5,
      "priority": "HIGH"
    }
  ],
  "vulnerableComponents": [
    {
      "name": "Component name",
      "failureRate": 25.5,
      "openDefects": 2,
      "riskScore": 75
    }
  ]
}`;

    let userPrompt = `Analyze the following real QA metrics for project "${project.name}" (Key: ${project.key}):\n\n`;
    userPrompt += formatPromptBlock('PROJECT_METRICS', metricsSummary);

    const aiRes = await AIGatewayService.executeCompletion({
      organizationId,
      projectId,
      userId,
      taskType: AITaskType.RISK_ANALYSIS,
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json',
      temperature: 0.1,
      maxTokens: 2000,
    });

    let parsed: any;
    try {
      const cleaned = aiRes.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const baseRisk = Math.min(100, criticalCount * 25 + highCount * 12 + Math.round(failureRate * 0.8));
      const category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
        baseRisk > 75 ? 'CRITICAL' : baseRisk > 50 ? 'HIGH' : baseRisk > 25 ? 'MEDIUM' : 'LOW';
      parsed = {
        overallRiskScore: baseRisk,
        riskCategory: category,
        summary: `Project presents ${criticalCount} critical defects with a ${failureRate.toFixed(1)}% test failure rate.`,
        contributingFactors: [
          { factor: 'Defect Severity Concentration', impact: `${criticalCount} critical, ${highCount} high`, weight: 0.5 },
          { factor: 'Execution Failure Rate', impact: `${failureRate.toFixed(1)}% failures`, weight: 0.5 },
        ],
        recommendedTestFocus: [
          {
            area: 'Core API Execution',
            suggestedAction: 'Execute full regression test suite',
            testCasesCount: Math.max(5, failedExecutions),
            priority: 'HIGH',
          },
        ],
        vulnerableComponents: [
          {
            name: 'Core Engine',
            failureRate: Number(failureRate.toFixed(1)),
            openDefects: openDefects.length,
            riskScore: baseRisk,
          },
        ],
      };
    }

    // Persist generation record
    const generation = await prisma.aIGeneration.create({
      data: {
        projectId,
        organizationId,
        userId,
        taskType: AITaskType.RISK_ANALYSIS,
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
        targetType: 'RISK_ANALYSIS',
        targetId: projectId,
        summary: parsed.summary || 'Project Risk Analysis',
        rootCause: null,
        observedFacts: [metricsSummary],
        hypotheses: [],
        confidence: 0.9,
        recommendations: (parsed.recommendedTestFocus || []).map((r: any) => `${r.area}: ${r.suggestedAction}`),
      },
    });

    return {
      overallRiskScore: parsed.overallRiskScore || 50,
      riskCategory: parsed.riskCategory || 'MEDIUM',
      summary: parsed.summary || 'Risk assessment completed.',
      contributingFactors: Array.isArray(parsed.contributingFactors) ? parsed.contributingFactors : [],
      recommendedTestFocus: Array.isArray(parsed.recommendedTestFocus) ? parsed.recommendedTestFocus : [],
      vulnerableComponents: Array.isArray(parsed.vulnerableComponents) ? parsed.vulnerableComponents : [],
      dataSources: {
        totalTestCasesAnalyzed: totalExecutions,
        failedExecutionsAnalyzed: failedExecutions,
        openDefectsAnalyzed: openDefects.length,
        codeIntegrationAvailable: false,
      },
    };
  }
}
