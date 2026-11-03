import { AIProviderType } from '@ai-qa/shared-types';

export interface AIProviderResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  model: string;
  latencyMs: number;
  raw?: any;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'json' | 'text';
}

export interface AIEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  tokens: number;
}

export interface AIProviderAdapter {
  getProviderType(): AIProviderType;
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<AIProviderResponse>;
  generateEmbedding(text: string): Promise<AIEmbeddingResponse>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; message?: string }>;
}
