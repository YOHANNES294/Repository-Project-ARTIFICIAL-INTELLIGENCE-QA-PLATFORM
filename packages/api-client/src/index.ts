import { ApiResponse, HealthCheckResponse } from '@ai-qa/shared-types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`Health check request failed with status: ${res.status}`);
    }
    const json = (await res.json()) as ApiResponse<HealthCheckResponse>;
    if (!json.success || !json.data) {
      throw new Error(json.error?.message || 'Health check returned non-success response');
    }
    return json.data;
  }
}

export const defaultApiClient = new ApiClient();
