import { AIProviderType } from '@ai-qa/shared-types';
import {
  AIProviderAdapter,
  AIProviderResponse,
  AICompletionOptions,
  AIEmbeddingResponse,
} from './ai-provider.adapter';

export class AnthropicAdapter implements AIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey: string,
    baseUrl = 'https://api.anthropic.com/v1',
    defaultModel = 'claude-3-5-haiku-20241022'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultModel = defaultModel;
  }

  getProviderType(): AIProviderType {
    return AIProviderType.ANTHROPIC;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      // Anthropic does not have a dedicated ping endpoint, sending a 1-token query
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      const latencyMs = Date.now() - start;
      if (!res.ok && res.status !== 400) {
        const err = await res.text();
        return {
          success: false,
          latencyMs,
          message: `Anthropic returned status ${res.status}: ${err.slice(0, 100)}`,
        };
      }

      return {
        success: true,
        latencyMs,
        message: 'Anthropic API connection verified successfully',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || 'Failed to connect to Anthropic',
      };
    }
  }

  async generateEmbedding(_text: string): Promise<AIEmbeddingResponse> {
    // Anthropic does not provide an embedding API; fallback to zero/deterministic vector
    const dimensions = 1536;
    return {
      embedding: new Array(dimensions).fill(0),
      dimensions,
      tokens: 0,
    };
  }

  async generateCompletion(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AIProviderResponse> {
    const start = Date.now();
    const model = options?.model || this.defaultModel;

    let userContent = prompt;
    if (options?.responseFormat === 'json') {
      userContent += '\n\nIMPORTANT: Return ONLY a valid JSON object. No conversational preamble, markdown code blocks, or postscript.';
    }

    const body: any = {
      model,
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.2,
      messages: [{ role: 'user', content: userContent }],
    };

    if (options?.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic completion failed (${res.status}): ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    let content = '';
    if (Array.isArray(data.content)) {
      content = data.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');
    }

    const promptTokens = data.usage?.input_tokens || Math.ceil(prompt.length / 4);
    const completionTokens = data.usage?.output_tokens || Math.ceil(content.length / 4);
    const totalTokens = promptTokens + completionTokens;

    // Pricing calculation based on Claude 3.5 Haiku ($0.80/1M in, $4.00/1M out)
    const costUsd = Number(
      ((promptTokens * 0.0000008) + (completionTokens * 0.000004)).toFixed(6)
    );

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
      model,
      latencyMs,
      raw: data,
    };
  }
}
