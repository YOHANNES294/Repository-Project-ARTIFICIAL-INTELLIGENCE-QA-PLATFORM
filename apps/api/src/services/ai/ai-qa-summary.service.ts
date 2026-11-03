import { prisma } from '../../prisma';
import {
  AITaskType,
  AIGenerationStatus,
  AIQAReportDto,
  GenerateQAReportInput,
  DefectSeverity,
  DefectStatus,
} from '@ai-qa/shared-types';
import { AIGatewayService } from './ai-gateway.service';
import { formatPromptBlock } from '../../utils/prompt-sanitizer';
import { NotFoundError } from '../../errors';

export class AIQASummaryService {
  /**
   * Generate an executive QA summary grounded in actual project execution and defect metrics.
   */
  static async generateReport(
    projectId: string,
    organizationId: string,
    userId: string,
    input: GenerateQAReportInput
  ): Promise<AIQAReportDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    let milestoneName = 'Full Project Scope';
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: input.milestoneId, projectId },
      });
      if (!milestone) {
        throw new NotFoundError('Milestone not found in this project');
      }
      milestoneName = `Milestone: ${milestone.name} (${milestone.status})`;
    }

    // 1. Defect stats
    const allDefects = await prisma.defect.findMany({
      where: {
        projectId,
        ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
      },
      select: {
        id: true,
        defectNumber: true,
        title: true,
        severity: true,
        status: true,
      },
    });

    const totalDefects = allDefects.length;
    const resolvedDefects = allDefects.filter((d) =>
      [DefectStatus.FIXED, DefectStatus.VERIFIED, DefectStatus.CLOSED].includes(d.status as DefectStatus)
    ).length;
    const openDefects = totalDefects - resolvedDefects;
    const criticalDefectsList = allDefects.filter(
      (d) => d.severity === DefectSeverity.CRITICAL && ![DefectStatus.CLOSED, DefectStatus.VERIFIED].includes(d.status as DefectStatus)
    );
    const criticalCount = criticalDefectsList.length;

    // 2. Test Run & Case stats
    const testRuns = await prisma.testRun.findMany({
      where: {
        projectId,
        ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
        ...(input.testPlanId ? { testPlanId: input.testPlanId } : {}),
      },
      include: {
        cases: {
          select: { status: true },
        },
      },
      take: 20,
    });

    let totalExecutions = 0;
    let passedCases = 0;
    let failedCases = 0;
    let blockedCases = 0;

    for (const run of testRuns) {
      for (const rc of run.cases) {
        totalExecutions++;
        if (rc.status === 'PASSED') passedCases++;
        else if (rc.status === 'FAILED') failedCases++;
        else if (rc.status === 'BLOCKED') blockedCases++;
      }
    }

    const totalTestCases = await prisma.testCase.count({ where: { projectId } });
    const passRate = totalExecutions > 0 ? (passedCases / totalExecutions) * 100 : 0;
    const completionRate = totalExecutions > 0 ? ((passedCases + failedCases) / totalExecutions) * 100 : 0;

    const metricsSummary = [
      `Scope: ${milestoneName}`,
      `Total Distinct Test Cases in Project: ${totalTestCases}`,
      `Total Executions (Recent): ${totalExecutions}`,
      `Passed: ${passedCases} | Failed: ${failedCases} | Blocked: ${blockedCases}`,
      `Pass Rate: ${passRate.toFixed(1)}% | Completion Rate: ${completionRate.toFixed(1)}%`,
      `Total Defects Logged: ${totalDefects}`,
      `Open Defects: ${openDefects} | Resolved: ${resolvedDefects}`,
      `Open Critical Blockers: ${criticalCount}`,
    ].join('\n');

    const systemPrompt = `You are an expert AI Principal QA Director.
Your task is to synthesize an executive QA release summary grounded directly in project testing telemetry.
You MUST output valid JSON only, without markdown fences or conversational preambles:
{
  "headline": "Brief executive headline",
  "executiveSummary": "Concise executive overview of release health and quality posture",
  "releaseReadiness": {
    "status": "READY" | "CONDITIONAL" | "BLOCKED",
    "score": number (0 to 100),
    "recommendation": "Executive release recommendation"
  },
  "keyFindings": ["Finding 1", "Finding 2"],
  "testingGaps": ["Gap 1", "Gap 2"],
  "suggestedActions": ["Action 1", "Action 2"]
}`;

    let userPrompt = `Synthesize an Executive QA Summary based on these verified metrics:\n\n`;
    userPrompt += formatPromptBlock('PROJECT_QA_METRICS', metricsSummary);

    const aiRes = await AIGatewayService.executeCompletion({
      organizationId,
      projectId,
      userId,
      taskType: AITaskType.QA_REPORT_SUMMARY,
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
      const readinessStatus = criticalCount > 0 ? 'BLOCKED' : passRate >= 85 ? 'READY' : 'CONDITIONAL';
      parsed = {
        headline: `QA Executive Status Report: ${project.name}`,
        executiveSummary: `Testing execution completed ${totalExecutions} runs with ${passRate.toFixed(1)}% pass rate and ${openDefects} open defects.`,
        releaseReadiness: {
          status: readinessStatus,
          score: Math.round(passRate * 0.7 + (criticalCount === 0 ? 30 : Math.max(0, 30 - criticalCount * 15))),
          recommendation: criticalCount > 0 ? 'Resolve critical defects before deployment' : 'Proceed with final validation',
        },
        keyFindings: [
          `Execution pass rate at ${passRate.toFixed(1)}%`,
          `${resolvedDefects} of ${totalDefects} defects verified`,
        ],
        testingGaps: ['Expand automated coverage on high-risk boundary cases'],
        suggestedActions: ['Complete retest of open defect fixes'],
      };
    }

    // Persist generation record
    const generation = await prisma.aIGeneration.create({
      data: {
        projectId,
        organizationId,
        userId,
        taskType: AITaskType.QA_REPORT_SUMMARY,
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
        targetType: 'QA_REPORT',
        targetId: input.milestoneId || input.testPlanId || projectId,
        summary: parsed.headline || 'Executive QA Report Summary',
        rootCause: null,
        observedFacts: [metricsSummary],
        hypotheses: parsed.keyFindings || [],
        confidence: 0.95,
        recommendations: parsed.suggestedActions || [],
      },
    });

    return {
      headline: parsed.headline || `QA Executive Summary: ${project.name}`,
      executiveSummary: parsed.executiveSummary || 'Executive summary generated.',
      releaseReadiness: {
        status: parsed.releaseReadiness?.status || (criticalCount > 0 ? 'BLOCKED' : 'CONDITIONAL'),
        score: parsed.releaseReadiness?.score || 85,
        recommendation: parsed.releaseReadiness?.recommendation || 'Verify pending fixes before rollout.',
      },
      metricsSummary: {
        totalTestCases,
        totalExecutions,
        passRatePercent: Number(passRate.toFixed(1)),
        completionRatePercent: Number(completionRate.toFixed(1)),
        openDefects,
        criticalDefects: criticalCount,
        reopenRatePercent: 0,
      },
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      blockerIssues: criticalDefectsList.map((d) => ({
        key: `${project.key}-BUG-${d.defectNumber}`,
        title: d.title,
        severity: d.severity,
      })),
      testingGaps: Array.isArray(parsed.testingGaps) ? parsed.testingGaps : [],
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      generatedAt: new Date().toISOString(),
    };
  }
}
