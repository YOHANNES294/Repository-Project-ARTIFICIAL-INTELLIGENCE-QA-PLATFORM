import {
  ApiResponse,
  HealthCheckResponse,
  ProjectDto,
  ProjectMemberDto,
  EnvironmentDto,
  ProjectStatus,
  ProjectRole,
} from '@ai-qa/shared-types';

export interface ProjectListParams {
  search?: string;
  status?: ProjectStatus;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProjectPayload {
  name: string;
  key: string;
  description?: string;
  objectives?: string;
  status?: ProjectStatus;
  settings?: Record<string, unknown>;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  objectives?: string | null;
  status?: ProjectStatus;
  settings?: Record<string, unknown>;
}

export interface CreateEnvironmentPayload {
  name: string;
  type?: string;
  url?: string | null;
  description?: string | null;
  variables?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateEnvironmentPayload {
  name?: string;
  type?: string;
  url?: string | null;
  description?: string | null;
  variables?: Record<string, unknown>;
  isActive?: boolean;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    });

    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok || !json.success) {
      const errorMsg = json.error?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg) as Error & { code?: string; details?: unknown; status: number };
      error.code = json.error?.code;
      error.details = json.error?.details;
      error.status = res.status;
      throw error;
    }

    return json.data as T;
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health');
  }

  // Projects
  async getProjects(params: ProjectListParams = {}): Promise<{ projects: ProjectDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.isArchived !== undefined) query.set('isArchived', String(params.isArchived));
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/projects${queryString}`, {
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResponse<ProjectDto[]>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to fetch projects');
    }
    return {
      projects: json.data || [],
      meta: json.meta,
    };
  }

  async getProject(projectId: string): Promise<ProjectDto & { environments: EnvironmentDto[] }> {
    return this.request<ProjectDto & { environments: EnvironmentDto[] }>(`/projects/${projectId}`);
  }

  async createProject(payload: CreateProjectPayload): Promise<ProjectDto> {
    return this.request<ProjectDto>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProject(projectId: string, payload: UpdateProjectPayload): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async archiveProject(projectId: string): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/projects/${projectId}/archive`, {
      method: 'POST',
    });
  }

  async restoreProject(projectId: string): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/projects/${projectId}/restore`, {
      method: 'POST',
    });
  }

  async deleteProject(projectId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getProjectActivity(projectId: string, limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/projects/${projectId}/activity?limit=${limit}`);
  }

  // Project Members
  async getProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
    return this.request<ProjectMemberDto[]>(`/projects/${projectId}/members`);
  }

  async addProjectMember(
    projectId: string,
    payload: { userId: string; role?: ProjectRole }
  ): Promise<ProjectMemberDto> {
    return this.request<ProjectMemberDto>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProjectMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole
  ): Promise<ProjectMemberDto> {
    return this.request<ProjectMemberDto>(`/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeProjectMember(projectId: string, memberId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // Environments
  async getProjectEnvironments(projectId: string): Promise<EnvironmentDto[]> {
    return this.request<EnvironmentDto[]>(`/projects/${projectId}/environments`);
  }

  async createEnvironment(
    projectId: string,
    payload: CreateEnvironmentPayload
  ): Promise<EnvironmentDto> {
    return this.request<EnvironmentDto>(`/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateEnvironment(
    projectId: string,
    envId: string,
    payload: UpdateEnvironmentPayload
  ): Promise<EnvironmentDto> {
    return this.request<EnvironmentDto>(`/projects/${projectId}/environments/${envId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteEnvironment(projectId: string, envId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/environments/${envId}`, {
      method: 'DELETE',
    });
  }
}

export const defaultApiClient = new ApiClient();
