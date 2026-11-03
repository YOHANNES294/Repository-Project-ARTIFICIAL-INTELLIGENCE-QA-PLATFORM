import { AIProviderType } from '@ai-qa/shared-types';
import {
  AIProviderAdapter,
  AIProviderResponse,
  AICompletionOptions,
  AIEmbeddingResponse,
} from './ai-provider.adapter';

export class OpenAIAdapter implements AIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1', defaultModel = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultModel = defaultModel;
  }

  getProviderType(): AIProviderType {
    return AIProviderType.OPENAI;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errBody = await res.text();
        return {
          success: false,
          latencyMs,
          message: `OpenAI returned status ${res.status}: ${errBody.slice(0, 100)}`,
        };
      }

      return {
        success: true,
        latencyMs,
        message: 'OpenAI API connection verified successfully',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || 'Failed to connect to OpenAI',
      };
    }
  }

  async generateEmbedding(text: string): Promise<AIEmbeddingResponse> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI embedding failed (${res.status}): ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const item = data.data?.[0];
    if (!item?.embedding) {
      throw new Error('OpenAI returned invalid embedding response');
    }

    return {
      embedding: item.embedding,
      dimensions: item.embedding.length,
      tokens: data.usage?.total_tokens || Math.ceil(text.length / 4),
    };
  }

  async generateCompletion(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AIProviderResponse> {
    const start = Date.now();
    const model = options?.model || this.defaultModel;

    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2000,
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI completion failed (${res.status}): ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';

    const promptTokens = data.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
    const completionTokens = data.usage?.completion_tokens || Math.ceil(content.length / 4);
    const totalTokens = data.usage?.total_tokens || (promptTokens + completionTokens);

    // Pricing calculation based on gpt-4o-mini pricing ($0.15/1M in, $0.60/1M out)
    const costUsd = Number(
      ((promptTokens * 0.00000015) + (completionTokens * 0.00000060)).toFixed(6)
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
