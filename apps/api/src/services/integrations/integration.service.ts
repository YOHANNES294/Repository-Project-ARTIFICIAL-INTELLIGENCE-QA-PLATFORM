import { prisma } from '../../prisma.js';
import { NotFoundError, ValidationError } from '../../errors.js';
import {
  CreateIntegrationInput,
  UpdateIntegrationInput,
  TestIntegrationInput,
  TestIntegrationResultDto,
  IntegrationDto,
  IntegrationStatus,
} from '@ai-qa/shared-types';
import { SlackAdapter } from './adapters/slack.adapter.js';
import { TeamsAdapter } from './adapters/teams.adapter.js';
import { validateUrlForSSRF, safeFetch } from '../notifications/ssrf-guard.js';

export class IntegrationService {
  /**
   * Masks sensitive fields in configuration before sending to clients.
   */
  static maskConfig(config: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = { ...config };
    for (const key of Object.keys(masked)) {
      const lower = key.toLowerCase();
      if (
        (lower.includes('secret') || lower.includes('token') || lower.includes('key')) &&
        typeof masked[key] === 'string'
      ) {
        const val = masked[key] as string;
        masked[key] = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : '********';
      } else if (lower.includes('webhookurl') || lower.includes('url')) {
        const val = masked[key] as string;
        if (typeof val === 'string' && val.includes('://')) {
          try {
            const url = new URL(val);
            const pathSegments = url.pathname.split('/').filter(Boolean);
            const maskedPath =
              pathSegments.length > 1
                ? `/${pathSegments[0]}/.../${pathSegments[pathSegments.length - 1]}`
                : url.pathname;
            masked[key] = `${url.protocol}//${url.host}${maskedPath}`;
          } catch {
            masked[key] = 'https://***';
          }
        }
      }
    }
    return masked;
  }

  static toDto(integration: any, maskSecrets = true): IntegrationDto {
    const rawConfig = typeof integration.config === 'object' && integration.config !== null
      ? (integration.config as Record<string, unknown>)
      : {};

    return {
      id: integration.id,
      projectId: integration.projectId,
      organizationId: integration.organizationId,
      name: integration.name,
      provider: integration.provider,
      status: integration.status as IntegrationStatus,
      isEnabled: integration.isEnabled,
      events: integration.events || [],
      config: maskSecrets ? this.maskConfig(rawConfig) : rawConfig,
      lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toISOString() : null,
      lastError: integration.lastError,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  static async listProjectIntegrations(projectId: string): Promise<IntegrationDto[]> {
    const items = await prisma.integration.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item: any) => this.toDto(item));
  }

  static async listOrgIntegrations(organizationId: string): Promise<IntegrationDto[]> {
    const items = await prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item: any) => this.toDto(item));
  }

  static async getIntegration(id: string): Promise<IntegrationDto> {
    const item = await prisma.integration.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundError('Integration not found');
    }
    return this.toDto(item);
  }

  static async createIntegration(
    projectId: string | null,
    organizationId: string | null,
    input: CreateIntegrationInput
  ): Promise<IntegrationDto> {
    if (!projectId && !organizationId) {
      throw new ValidationError('Integration must belong to either a project or an organization');
    }

    // SSRF verification if webhookUrl is present
    const webhookUrl = input.config?.webhookUrl as string | undefined;
    if (webhookUrl) {
      const ssrfCheck = await validateUrlForSSRF(webhookUrl);
      if (!ssrfCheck.valid) {
        throw new ValidationError(`Security Error: Webhook URL rejected. ${ssrfCheck.error}`);
      }
    }

    const created = await prisma.integration.create({
      data: {
        projectId,
        organizationId,
        name: input.name || `${input.provider} Integration`,
        provider: input.provider,
        status: 'CONNECTED',
        isEnabled: input.isEnabled ?? true,
        events: input.events || [],
        config: input.config as any,
      },
    });

    return this.toDto(created);
  }

  static async updateIntegration(id: string, input: UpdateIntegrationInput): Promise<IntegrationDto> {
    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    let mergedConfig = (existing.config as Record<string, unknown>) || {};
    if (input.config) {
      const webhookUrl = input.config.webhookUrl as string | undefined;
      if (webhookUrl && !webhookUrl.includes('...')) {
        const ssrfCheck = await validateUrlForSSRF(webhookUrl);
        if (!ssrfCheck.valid) {
          throw new ValidationError(`Security Error: Webhook URL rejected. ${ssrfCheck.error}`);
        }
      }
      mergedConfig = { ...mergedConfig, ...input.config };
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.events !== undefined ? { events: input.events } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.config !== undefined ? { config: mergedConfig as any } : {}),
      },
    });

    return this.toDto(updated);
  }

  static async deleteIntegration(id: string): Promise<void> {
    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Integration not found');
    }
    await prisma.integration.delete({ where: { id } });
  }

  static async testIntegration(input: TestIntegrationInput): Promise<TestIntegrationResultDto> {
    const startTime = Date.now();
    const webhookUrl = (input.config?.webhookUrl || input.config?.url) as string | undefined;

    if (!webhookUrl) {
      return {
        success: false,
        message: 'Missing webhook URL in configuration.',
      };
    }

    const ssrfCheck = await validateUrlForSSRF(webhookUrl);
    if (!ssrfCheck.valid) {
      return {
        success: false,
        message: `SSRF Guard blocked URL: ${ssrfCheck.error}`,
      };
    }

    try {
      if (input.provider === 'SLACK') {
        const result = await SlackAdapter.send(webhookUrl, {
          title: 'Test Integration',
          message: 'This is a test notification from the AI QA Platform integration manager.',
          category: 'GENERAL',
          priority: 'NORMAL',
        });
        const latencyMs = Date.now() - startTime;
        return {
          success: result.success,
          message: result.success ? 'Slack test message delivered successfully.' : result.error || 'Slack request failed.',
          statusCode: result.statusCode,
          latencyMs,
        };
      }

      if (input.provider === 'TEAMS') {
        const result = await TeamsAdapter.send(webhookUrl, {
          title: 'Test Integration',
          message: 'This is a test notification from the AI QA Platform integration manager.',
          category: 'GENERAL',
          priority: 'NORMAL',
        });
        const latencyMs = Date.now() - startTime;
        return {
          success: result.success,
          message: result.success ? 'Microsoft Teams test message delivered successfully.' : result.error || 'Teams request failed.',
          statusCode: result.statusCode,
          latencyMs,
        };
      }

      // Generic Webhook or GitHub test ping
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIQA-Event': 'ping',
        },
        body: JSON.stringify({
          event: 'ping',
          timestamp: new Date().toISOString(),
          message: 'AI QA Platform Test Webhook Ping',
        }),
      });

      const latencyMs = Date.now() - startTime;
      return {
        success: res.ok,
        message: res.ok ? 'Webhook ping received response successfully.' : `Webhook responded with HTTP ${res.status}`,
        statusCode: res.status,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: `Connection test failed: ${err.message}`,
        latencyMs,
      };
    }
  }
}
