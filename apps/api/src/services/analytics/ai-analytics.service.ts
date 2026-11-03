import { prisma } from '../../prisma.js';
import { NotFoundError } from '../../errors.js';
import { AIIntelligenceAnalyticsDto } from '@ai-qa/shared-types';

export class AIAnalyticsService {
  static async getAIMetrics(
    projectId: string,
    organizationId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      provider?: string;
    } = {}
  ): Promise<AIIntelligenceAnalyticsDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found or tenant access denied');
    }

    const now = new Date();
    const end = filters.endDate ? new Date(filters.endDate) : now;
    const start = filters.startDate ? new Date(filters.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch AI Generations & Items
    const generations = await prisma.aIGeneration.findMany({
      where: {
        projectId,
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          select: { id: true, reviewStatus: true },
        },
      },
    });

    let totalProposedCases = 0;
    let acceptedCases = 0;
    let rejectedCases = 0;

    for (const g of generations) {
      for (const item of g.items) {
        totalProposedCases++;
        if (item.reviewStatus === 'ACCEPTED') acceptedCases++;
        else if (item.reviewStatus === 'REJECTED') rejectedCases++;
      }
    }

    const reviewed = acceptedCases + rejectedCases;
    const humanAcceptanceRate = reviewed > 0 ? Math.round((acceptedCases / reviewed) * 1000) / 10 : 0;

    // 2. Fetch AI Usage Logs
    const logWhere: any = {
      projectId,
      organizationId,
      createdAt: { gte: start, lte: end },
    };
    if (filters.provider) logWhere.provider = filters.provider;

    const usageLogs = await prisma.aIUsageLog.findMany({
      where: logWhere,
    });

    let totalTokensConsumed = 0;
    let estimatedTotalCost = 0;
    let totalLatencyMs = 0;
    let latencyCount = 0;
    let errorCount = 0;

    const taskMap = new Map<string, { taskType: string; count: number; tokens: number; cost: number }>();
    const providerMap = new Map<string, { provider: string; model: string; calls: number; tokens: number; errors: number; cost: number }>();

    for (const log of usageLogs) {
      const tokens = log.tokensUsed || 0;
      const cost = log.estimatedCost || 0;
      totalTokensConsumed += tokens;
      estimatedTotalCost += cost;

      if (log.durationMs && log.durationMs > 0) {
        totalLatencyMs += log.durationMs;
        latencyCount++;
      }

      if (!log.success) {
        errorCount++;
      }

      // Task breakdown
      const task = log.feature || 'OTHER';
      if (!taskMap.has(task)) {
        taskMap.set(task, { taskType: task, count: 0, tokens: 0, cost: 0 });
      }
      const tData = taskMap.get(task)!;
      tData.count++;
      tData.tokens += tokens;
      tData.cost += cost;

      // Provider breakdown
      const pKey = `${log.provider}:${log.modelName}`;
      if (!providerMap.has(pKey)) {
        providerMap.set(pKey, {
          provider: log.provider,
          model: log.modelName,
          calls: 0,
          tokens: 0,
          errors: 0,
          cost: 0,
        });
      }
      const pData = providerMap.get(pKey)!;
      pData.calls++;
      pData.tokens += tokens;
      pData.cost += cost;
      if (!log.success) pData.errors++;
    }

    const avgLatencyMs = latencyCount > 0 ? Math.round(totalLatencyMs / latencyCount) : 0;
    const errorRate = usageLogs.length > 0 ? Math.round((errorCount / usageLogs.length) * 1000) / 10 : 0;

    // 3. Fetch User Feedback
    const feedbacks = await prisma.aIFeedback.findMany({
      where: {
        generation: { projectId },
        createdAt: { gte: start, lte: end },
      },
      select: { rating: true, ratingCategory: true },
    });

    let helpfulCount = 0;
    let notHelpfulCount = 0;
    let inaccurateCount = 0;
    let incompleteCount = 0;

    for (const fb of feedbacks) {
      if (fb.ratingCategory === 'HELPFUL' || (!fb.ratingCategory && fb.rating >= 4)) helpfulCount++;
      else if (fb.ratingCategory === 'NOT_HELPFUL' || (!fb.ratingCategory && fb.rating <= 2)) notHelpfulCount++;
      else if (fb.ratingCategory === 'INACCURATE') inaccurateCount++;
      else if (fb.ratingCategory === 'INCOMPLETE') incompleteCount++;
    }

    const totalRatings = feedbacks.length;
    const satisfactionRate = totalRatings > 0 ? Math.round((helpfulCount / totalRatings) * 1000) / 10 : 0;

    const taskBreakdown = Array.from(taskMap.values()).map((t) => ({
      ...t,
      cost: Math.round(t.cost * 10000) / 10000,
    }));

    const providerBreakdown = Array.from(providerMap.values()).map((p) => ({
      ...p,
      cost: Math.round(p.cost * 10000) / 10000,
    }));

    return {
      summary: {
        totalGenerations: generations.length,
        totalProposedCases,
        acceptedCases,
        rejectedCases,
        humanAcceptanceRate,
        totalTokensConsumed,
        estimatedTotalCost: Math.round(estimatedTotalCost * 10000) / 10000,
        avgLatencyMs,
        errorRate,
      },
      taskBreakdown,
      providerBreakdown,
      userFeedbackSummary: {
        totalRatings,
        helpfulCount,
        notHelpfulCount,
        inaccurateCount,
        incompleteCount,
        satisfactionRate,
      },
    };
  }
}
