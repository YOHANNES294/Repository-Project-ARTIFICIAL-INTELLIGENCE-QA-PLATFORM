import { AIProviderType } from '@ai-qa/shared-types';
import {
  AIProviderAdapter,
  AIProviderResponse,
  AICompletionOptions,
  AIEmbeddingResponse,
} from './ai-provider.adapter';

export class GeminiAdapter implements AIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey: string,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel = 'gemini-2.0-flash'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultModel = defaultModel;
  }

  getProviderType(): AIProviderType {
    return AIProviderType.GEMINI;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        method: 'GET',
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          latencyMs,
          message: `Gemini returned status ${res.status}: ${err.slice(0, 100)}`,
        };
      }

      return {
        success: true,
        latencyMs,
        message: 'Google Gemini API connection verified successfully',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || 'Failed to connect to Google Gemini',
      };
    }
  }

  async generateEmbedding(text: string): Promise<AIEmbeddingResponse> {
    const res = await fetch(
      `${this.baseUrl}/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini embedding failed (${res.status}): ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const values = data.embedding?.values;
    if (!values) {
      throw new Error('Gemini returned invalid embedding response');
    }

    return {
      embedding: values,
      dimensions: values.length,
      tokens: Math.ceil(text.length / 4),
    };
  }

  async generateCompletion(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AIProviderResponse> {
    const start = Date.now();
    const model = options?.model || this.defaultModel;

    const contents: any[] = [];
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const generationConfig: any = {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    const body: any = {
      contents,
      generationConfig,
    };

    if (options?.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini completion failed (${res.status}): ${err.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    const promptTokens = data.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(content.length / 4);
    const totalTokens = data.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

    // Gemini 2.0 Flash pricing (~$0.10/1M in, $0.40/1M out)
    const costUsd = Number(
      ((promptTokens * 0.00000010) + (completionTokens * 0.00000040)).toFixed(6)
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
