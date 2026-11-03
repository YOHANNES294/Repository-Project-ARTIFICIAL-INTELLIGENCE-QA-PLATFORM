import { prisma } from '../../prisma';
import {
  AIProviderType,
  AITaskType,
  AIProviderConfigDto,
  UpdateAIProviderConfigInput,
} from '@ai-qa/shared-types';
import {
  AIProviderAdapter,
  AIProviderResponse,
  AIEmbeddingResponse,
  MockAIAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  GeminiAdapter,
} from './adapters';
import {
  encryptApiKeyComponents,
  decryptApiKeyComponents,
  maskApiKey,
} from '../../utils/ai-crypto';
import { logger } from '../../logger';
import { ValidationError } from '../../errors';

export class AIGatewayService {
  /**
   * Get active AI Provider configuration for an organization.
   * API keys are masked for security.
   */
  static async getProviderConfig(organizationId: string): Promise<AIProviderConfigDto> {
    const config = await prisma.aIProviderConfig.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      // Default to MOCK provider if not yet configured
      return {
        id: 'default',
        organizationId,
        provider: AIProviderType.MOCK,
        modelName: 'mock-llm-v1',
        apiEndpoint: null,
        isActive: true,
        hasKey: false,
        maskedKey: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const hasKey = !!(config.apiKeyEncrypted && config.apiKeyIv && config.apiKeyTag);
    let maskedKey: string | null = null;
    if (hasKey) {
      try {
        const plain = decryptApiKeyComponents(
          config.apiKeyEncrypted!,
          config.apiKeyIv!,
          config.apiKeyTag!
        );
        maskedKey = maskApiKey(plain);
      } catch {
        maskedKey = '****';
      }
    }

    return {
      id: config.id,
      organizationId: config.organizationId,
      provider: config.provider as AIProviderType,
      modelName: config.modelName,
      apiEndpoint: config.apiEndpoint || null,
      isActive: config.isActive,
      hasKey,
      maskedKey,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  /**
   * Update or create organization AI provider configuration
   */
  static async updateProviderConfig(
    organizationId: string,
    input: UpdateAIProviderConfigInput
  ): Promise<AIProviderConfigDto> {
    const provider = input.provider || AIProviderType.MOCK;

    let keyComponents: { ciphertext: string; iv: string; tag: string } | null = null;
    if (input.apiKey) {
      keyComponents = encryptApiKeyComponents(input.apiKey.trim());
    }

    // Non-mock providers require an API key if not already configured
    if (provider !== AIProviderType.MOCK && !keyComponents) {
      const existing = await prisma.aIProviderConfig.findUnique({
        where: {
          organizationId_provider: {
            organizationId,
            provider,
          },
        },
      });
      if (!existing?.apiKeyEncrypted) {
        throw new ValidationError(`API key is required for provider ${provider}`);
      }
    }

    const updated = await prisma.aIProviderConfig.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
      create: {
        organizationId,
        provider,
        apiKeyEncrypted: keyComponents?.ciphertext || null,
        apiKeyIv: keyComponents?.iv || null,
        apiKeyTag: keyComponents?.tag || null,
        apiEndpoint: input.apiEndpoint || null,
        modelName: input.modelName || this.getDefaultModelForProvider(provider),
        isActive: input.isActive ?? true,
      },
      update: {
        ...(keyComponents
          ? {
              apiKeyEncrypted: keyComponents.ciphertext,
              apiKeyIv: keyComponents.iv,
              apiKeyTag: keyComponents.tag,
            }
          : {}),
        ...(input.apiEndpoint !== undefined ? { apiEndpoint: input.apiEndpoint || null } : {}),
        ...(input.modelName ? { modelName: input.modelName } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    // If activating this provider, deactivate any other providers for this org
    if (updated.isActive) {
      await prisma.aIProviderConfig.updateMany({
        where: {
          organizationId,
          id: { not: updated.id },
        },
        data: { isActive: false },
      });
    }

    const hasKey = !!(updated.apiKeyEncrypted && updated.apiKeyIv && updated.apiKeyTag);
    let maskedKey: string | null = null;
    if (hasKey) {
      try {
        const plain = decryptApiKeyComponents(
          updated.apiKeyEncrypted!,
          updated.apiKeyIv!,
          updated.apiKeyTag!
        );
        maskedKey = maskApiKey(plain);
      } catch {
        maskedKey = '****';
      }
    }

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      provider: updated.provider as AIProviderType,
      modelName: updated.modelName,
      apiEndpoint: updated.apiEndpoint || null,
      isActive: updated.isActive,
      hasKey,
      maskedKey,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Test connection to configured AI provider
   */
  static async testProviderConnection(
    organizationId: string
  ): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const adapter = await this.resolveAdapter(organizationId);
    return adapter.testConnection();
  }

  /**
   * Resolve appropriate AI adapter for the organization
   */
  static async resolveAdapter(organizationId: string): Promise<AIProviderAdapter> {
    const config = await prisma.aIProviderConfig.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    // If unconfigured or inactive, fall back gracefully to Mock adapter
    if (!config || !config.isActive) {
      return new MockAIAdapter();
    }

    const providerType = config.provider as AIProviderType;

    switch (providerType) {
      case AIProviderType.MOCK:
        return new MockAIAdapter(config.modelName);

      case AIProviderType.OPENAI: {
        const apiKey = config.apiKeyEncrypted && config.apiKeyIv && config.apiKeyTag
          ? decryptApiKeyComponents(config.apiKeyEncrypted, config.apiKeyIv, config.apiKeyTag)
          : '';
        if (!apiKey) throw new ValidationError('OpenAI API key is missing or invalid');
        return new OpenAIAdapter(apiKey, config.apiEndpoint || undefined, config.modelName);
      }

      case AIProviderType.ANTHROPIC: {
        const apiKey = config.apiKeyEncrypted && config.apiKeyIv && config.apiKeyTag
          ? decryptApiKeyComponents(config.apiKeyEncrypted, config.apiKeyIv, config.apiKeyTag)
          : '';
        if (!apiKey) throw new ValidationError('Anthropic API key is missing or invalid');
        return new AnthropicAdapter(apiKey, config.apiEndpoint || undefined, config.modelName);
      }

      case AIProviderType.GEMINI: {
        const apiKey = config.apiKeyEncrypted && config.apiKeyIv && config.apiKeyTag
          ? decryptApiKeyComponents(config.apiKeyEncrypted, config.apiKeyIv, config.apiKeyTag)
          : '';
        if (!apiKey) throw new ValidationError('Gemini API key is missing or invalid');
        return new GeminiAdapter(apiKey, config.apiEndpoint || undefined, config.modelName);
      }

      default:
        return new MockAIAdapter();
    }
  }

  /**
   * Execute AI completion with usage logging and telemetry
   */
  static async executeCompletion(params: {
    organizationId: string;
    projectId?: string;
    userId: string;
    taskType: AITaskType;
    prompt: string;
    systemPrompt?: string;
    responseFormat?: 'json' | 'text';
    temperature?: number;
    maxTokens?: number;
  }): Promise<AIProviderResponse> {
    const { organizationId, projectId, userId, taskType, prompt, systemPrompt, responseFormat } = params;

    const adapter = await this.resolveAdapter(organizationId);
    const providerType = adapter.getProviderType();

    try {
      const response = await adapter.generateCompletion(prompt, {
        systemPrompt,
        responseFormat,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      // Log usage telemetry in background safely
      try {
        await prisma.aIUsageLog.create({
          data: {
            organizationId,
            projectId: projectId || null,
            userId,
            provider: providerType,
            modelName: response.model,
            feature: taskType,
            tokensPrompt: response.promptTokens,
            tokensCompletion: response.completionTokens,
            tokensUsed: response.totalTokens,
            estimatedCost: response.costUsd,
            durationMs: response.latencyMs,
            success: true,
          },
        });
      } catch (logErr) {
        logger.error('Failed to record AI usage log', { err: logErr, organizationId });
      }

      return response;
    } catch (err: any) {
      // Record failed telemetry safely
      try {
        await prisma.aIUsageLog.create({
          data: {
            organizationId,
            projectId: projectId || null,
            userId,
            provider: providerType,
            modelName: 'unknown',
            feature: taskType,
            tokensPrompt: 0,
            tokensCompletion: 0,
            tokensUsed: 0,
            estimatedCost: 0,
            durationMs: 0,
            success: false,
          },
        });
      } catch {}

      logger.error('AI execution failure', { err, organizationId, taskType });
      throw err;
    }
  }

  /**
   * Execute embedding generation
   */
  static async executeEmbedding(params: {
    organizationId: string;
    projectId?: string;
    userId: string;
    text: string;
  }): Promise<AIEmbeddingResponse> {
    const { organizationId, text } = params;
    const adapter = await this.resolveAdapter(organizationId);
    return adapter.generateEmbedding(text);
  }

  /**
   * Get organization usage stats
   */
  static async getUsageMetrics(organizationId: string, projectId?: string) {
    const where: any = { organizationId };
    if (projectId) {
      where.projectId = projectId;
    }

    const logs = await prisma.aIUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const summary = await prisma.aIUsageLog.aggregate({
      where,
      _sum: {
        tokensUsed: true,
        estimatedCost: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalRequests: summary._count.id,
      totalTokens: summary._sum.tokensUsed || 0,
      totalEstimatedCostUsd: Number((summary._sum.estimatedCost || 0).toFixed(4)),
      recentLogs: logs.map((l) => ({
        id: l.id,
        provider: l.provider,
        modelName: l.modelName,
        feature: l.feature,
        tokensUsed: l.tokensUsed,
        estimatedCostUsd: l.estimatedCost,
        durationMs: l.durationMs,
        success: l.success,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  private static getDefaultModelForProvider(provider: AIProviderType): string {
    switch (provider) {
      case AIProviderType.OPENAI:
        return 'gpt-4o-mini';
      case AIProviderType.ANTHROPIC:
        return 'claude-3-5-haiku-20241022';
      case AIProviderType.GEMINI:
        return 'gemini-2.0-flash';
      case AIProviderType.MOCK:
      default:
        return 'mock-llm-v1';
    }
  }
}
