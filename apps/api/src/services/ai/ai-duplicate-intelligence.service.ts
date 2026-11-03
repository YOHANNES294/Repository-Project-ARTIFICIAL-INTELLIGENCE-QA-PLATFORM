import { prisma } from '../../prisma';
import {
  AITaskType,
  AIGenerationStatus,
  AIDuplicateAnalysisDto,
  AnalyzeDuplicateDefectInput,
} from '@ai-qa/shared-types';
import { AIGatewayService } from './ai-gateway.service';
import { formatPromptBlock } from '../../utils/prompt-sanitizer';
import { NotFoundError } from '../../errors';

export class AIDuplicateIntelligenceService {
  /**
   * Compare candidate defect against existing project defects using lexical and semantic analysis.
   */
  static async analyzeDuplicate(
    projectId: string,
    organizationId: string,
    userId: string,
    input: AnalyzeDuplicateDefectInput
  ): Promise<AIDuplicateAnalysisDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in current organization');
    }

    const candidateTitle = input.title.trim();
    const candidateDesc = input.description.trim();

    // Retrieve open and recent defects in the project
    const existingDefects = await prisma.defect.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        defectNumber: true,
        title: true,
        description: true,
        actualResult: true,
        status: true,
        severity: true,
        component: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    if (existingDefects.length === 0) {
      return {
        candidateDefectId: 'none',
        candidateKey: 'NONE',
        candidateTitle: 'No candidate comparison available',
        similarityScore: 0.0,
        confidenceLevel: 'LOW',
        matchReasons: ['No existing defects in this project to compare against'],
        errorSignatureMatch: false,
        componentMatch: false,
        suggestedAction: 'KEEP_SEPARATE',
      };
    }

    // Rank candidates by lexical token overlap
    const candidateTokens = this.tokenize(`${candidateTitle} ${candidateDesc}`);
    const scoredCandidates = existingDefects.map((d) => {
      const tokens = this.tokenize(`${d.title} ${d.description || ''} ${d.actualResult || ''}`);
      const lexicalScore = this.jaccardSimilarity(candidateTokens, tokens);
      return { defect: d, lexicalScore };
    });

    // Sort descending by lexical score
    scoredCandidates.sort((a, b) => b.lexicalScore - a.lexicalScore);
    const topCandidate = scoredCandidates[0];

    const systemPrompt = `You are an expert AI Principal QA Defect Analyst.
Your task is to analyze two defects and determine if the candidate is a DUPLICATE of an existing defect.
You MUST output valid JSON only, without any markdown formatting or preamble:
{
  "similarityScore": number (0.0 to 1.0),
  "confidenceLevel": "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW",
  "matchReasons": ["Shared symptom", "Matching reproduction trigger"],
  "errorSignatureMatch": boolean,
  "componentMatch": boolean,
  "suggestedAction": "MARK_DUPLICATE" | "LINK_RELATED" | "KEEP_SEPARATE"
}`;

    let userPrompt = `Compare Candidate Defect against Existing Defect:\n\n`;
    userPrompt += formatPromptBlock(
      'CANDIDATE_DEFECT',
      `Title: ${candidateTitle}\nDescription: ${candidateDesc}\nComponent: ${input.component || 'Not specified'}`
    );

    userPrompt += '\n\n' + formatPromptBlock(
      'EXISTING_DEFECT',
      `Key: ${project.key}-BUG-${topCandidate.defect.defectNumber}\nTitle: ${topCandidate.defect.title}\nDescription: ${topCandidate.defect.description || ''}\nActual Result: ${topCandidate.defect.actualResult || ''}\nComponent: ${topCandidate.defect.component || 'Not specified'}\nStatus: ${topCandidate.defect.status}`
    );

    const aiRes = await AIGatewayService.executeCompletion({
      organizationId,
      projectId,
      userId,
      taskType: AITaskType.DUPLICATE_DETECTION,
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json',
      temperature: 0.1,
      maxTokens: 1500,
    });

    let parsed: any;
    try {
      const cleaned = aiRes.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const isHigh = topCandidate.lexicalScore > 0.5;
      parsed = {
        similarityScore: Number(topCandidate.lexicalScore.toFixed(2)),
        confidenceLevel: isHigh ? 'HIGH' : 'MODERATE',
        matchReasons: ['Shared keywords and similar reproduction paths'],
        errorSignatureMatch: isHigh,
        componentMatch: input.component === topCandidate.defect.component,
        suggestedAction: isHigh ? 'MARK_DUPLICATE' : 'LINK_RELATED',
      };
    }

    // Persist generation record
    const generation = await prisma.aIGeneration.create({
      data: {
        projectId,
        organizationId,
        userId,
        taskType: AITaskType.DUPLICATE_DETECTION,
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
        targetType: 'DEFECT_DUPLICATE',
        targetId: topCandidate.defect.id,
        summary: `Duplicate Defect Comparison with ${project.key}-BUG-${topCandidate.defect.defectNumber}`,
        rootCause: null,
        observedFacts: parsed.matchReasons || [],
        hypotheses: [],
        confidence: parsed.similarityScore || 0.8,
        recommendations: [parsed.suggestedAction || 'KEEP_SEPARATE'],
      },
    });

    return {
      candidateDefectId: topCandidate.defect.id,
      candidateKey: `${project.key}-BUG-${topCandidate.defect.defectNumber}`,
      candidateTitle: topCandidate.defect.title,
      similarityScore: parsed.similarityScore || 0.8,
      confidenceLevel: parsed.confidenceLevel || 'HIGH',
      matchReasons: Array.isArray(parsed.matchReasons) ? parsed.matchReasons : ['High lexical and semantic similarity'],
      errorSignatureMatch: !!parsed.errorSignatureMatch,
      componentMatch: !!parsed.componentMatch,
      suggestedAction: parsed.suggestedAction || 'LINK_RELATED',
    };
  }

  private static tokenize(str: string): Set<string> {
    const words = str
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return new Set(words);
  }

  private static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
