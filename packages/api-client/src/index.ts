import {
  ApiResponse,
  HealthCheckResponse,
  ProjectDto,
  ProjectMemberDto,
  EnvironmentDto,
  ProjectStatus,
  ProjectRole,
  MilestoneDto,
  MilestoneProgressDto,
  MilestoneStatus,
  TestSuiteDto,
  TagDto,
  TestCaseDto,
  TestCaseVersionDto,
  VersionDiffDto,
  CsvImportPreviewResponse,
  CsvBulkImportInput,
  TestPriority,
  TestType,
  TestCaseStatus,
  TestPlanStatus,
  TestRunStatus,
  ExecutionStatus,
  TestPlanDto,
  TestPlanCaseDto,
  CreateTestPlanInput,
  UpdateTestPlanInput,
  SelectPlanCasesInput,
  DuplicateTestPlanInput,
  TestRunDto,
  TestRunCaseDto,
  CreateTestRunInput,
  UpdateTestRunInput,
  TransitionRunStatusInput,
  AssignRunCasesInput,
  TestResultDto,
  SubmitExecutionInput,
  RetestExecutionInput,
  AttachmentDto,
  ExecutionAnalyticsDto,
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

  // ----------------------------------------------------
  // MILESTONES (Milestone 04)
  // ----------------------------------------------------
  async getMilestones(
    projectId: string,
    params: {
      search?: string;
      status?: MilestoneStatus;
      priority?: TestPriority;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ milestones: MilestoneDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/projects/${projectId}/milestones${queryString}`, {
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResponse<MilestoneDto[]>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to fetch milestones');
    }
    return {
      milestones: json.data || [],
      meta: json.meta,
    };
  }

  async getMilestone(projectId: string, milestoneId: string): Promise<MilestoneDto> {
    return this.request<MilestoneDto>(`/projects/${projectId}/milestones/${milestoneId}`);
  }

  async createMilestone(projectId: string, payload: any): Promise<MilestoneDto> {
    return this.request<MilestoneDto>(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMilestone(projectId: string, milestoneId: string, payload: any): Promise<MilestoneDto> {
    return this.request<MilestoneDto>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
  }

  async getMilestoneProgress(projectId: string, milestoneId: string): Promise<MilestoneProgressDto> {
    return this.request<MilestoneProgressDto>(`/projects/${projectId}/milestones/${milestoneId}/progress`);
  }

  // ----------------------------------------------------
  // TEST SUITES (Milestone 04)
  // ----------------------------------------------------
  async getTestSuites(projectId: string): Promise<TestSuiteDto[]> {
    return this.request<TestSuiteDto[]>(`/projects/${projectId}/suites`);
  }

  async getTestSuite(projectId: string, suiteId: string): Promise<TestSuiteDto> {
    return this.request<TestSuiteDto>(`/projects/${projectId}/suites/${suiteId}`);
  }

  async createTestSuite(projectId: string, payload: any): Promise<TestSuiteDto> {
    return this.request<TestSuiteDto>(`/projects/${projectId}/suites`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTestSuite(projectId: string, suiteId: string, payload: any): Promise<TestSuiteDto> {
    return this.request<TestSuiteDto>(`/projects/${projectId}/suites/${suiteId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTestSuite(projectId: string, suiteId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/suites/${suiteId}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // TAGS (Milestone 04)
  // ----------------------------------------------------
  async getTags(projectId: string): Promise<TagDto[]> {
    return this.request<TagDto[]>(`/projects/${projectId}/tags`);
  }

  async createTag(projectId: string, payload: { name: string; color?: string }): Promise<TagDto> {
    return this.request<TagDto>(`/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTag(projectId: string, tagId: string, payload: { name?: string; color?: string }): Promise<TagDto> {
    return this.request<TagDto>(`/projects/${projectId}/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTag(projectId: string, tagId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // TEST CASES (Milestone 04)
  // ----------------------------------------------------
  async getTestCases(
    projectId: string,
    params: {
      search?: string;
      suiteId?: string;
      milestoneId?: string;
      priority?: TestPriority;
      type?: TestType;
      status?: TestCaseStatus;
      tag?: string;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ testCases: TestCaseDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.suiteId) query.set('suiteId', params.suiteId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.priority) query.set('priority', params.priority);
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    if (params.tag) query.set('tag', params.tag);
    if (params.isArchived !== undefined) query.set('isArchived', String(params.isArchived));
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${this.baseUrl}/projects/${projectId}/test-cases${queryString}`, {
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResponse<TestCaseDto[]>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to fetch test cases');
    }
    return {
      testCases: json.data || [],
      meta: json.meta,
    };
  }

  async getTestCase(projectId: string, caseId: string): Promise<TestCaseDto> {
    return this.request<TestCaseDto>(`/projects/${projectId}/test-cases/${caseId}`);
  }

  async createTestCase(projectId: string, payload: any): Promise<TestCaseDto> {
    return this.request<TestCaseDto>(`/projects/${projectId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTestCase(projectId: string, caseId: string, payload: any): Promise<TestCaseDto> {
    return this.request<TestCaseDto>(`/projects/${projectId}/test-cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async archiveTestCase(projectId: string, caseId: string): Promise<TestCaseDto> {
    return this.request<TestCaseDto>(`/projects/${projectId}/test-cases/${caseId}/archive`, {
      method: 'POST',
    });
  }

  async restoreTestCase(projectId: string, caseId: string): Promise<TestCaseDto> {
    return this.request<TestCaseDto>(`/projects/${projectId}/test-cases/${caseId}/restore`, {
      method: 'POST',
    });
  }

  async deleteTestCase(projectId: string, caseId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/test-cases/${caseId}`, {
      method: 'DELETE',
    });
  }

  async getTestCaseVersions(projectId: string, caseId: string): Promise<TestCaseVersionDto[]> {
    return this.request<TestCaseVersionDto[]>(`/projects/${projectId}/test-cases/${caseId}/versions`);
  }

  async getTestCaseVersion(
    projectId: string,
    caseId: string,
    versionNumber: number
  ): Promise<TestCaseVersionDto> {
    return this.request<TestCaseVersionDto>(
      `/projects/${projectId}/test-cases/${caseId}/versions/${versionNumber}`
    );
  }

  async compareTestCaseVersions(
    projectId: string,
    caseId: string,
    v1: number,
    v2: number
  ): Promise<VersionDiffDto> {
    return this.request<VersionDiffDto>(
      `/projects/${projectId}/test-cases/${caseId}/versions/compare?v1=${v1}&v2=${v2}`
    );
  }

  // ----------------------------------------------------
  // CSV IMPORT & EXPORT (Milestone 04)
  // ----------------------------------------------------
  async previewCsvImport(projectId: string, csvContent: string): Promise<CsvImportPreviewResponse> {
    return this.request<CsvImportPreviewResponse>(`/projects/${projectId}/test-cases/csv/preview`, {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    });
  }

  async bulkImportCsv(
    projectId: string,
    payload: CsvBulkImportInput
  ): Promise<{ importedCount: number; testCases: TestCaseDto[] }> {
    return this.request<{ importedCount: number; testCases: TestCaseDto[] }>(
      `/projects/${projectId}/test-cases/csv/import`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  getExportTestCasesCsvUrl(projectId: string, params: Record<string, string | undefined> = {}): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.set(key, val);
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return `${this.baseUrl}/projects/${projectId}/test-cases/csv/export${queryString}`;
  }

  // ----------------------------------------------------
  // TEST PLANS (Milestone 05)
  // ----------------------------------------------------
  async getTestPlans(
    projectId: string,
    params: {
      search?: string;
      status?: TestPlanStatus;
      milestoneId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ testPlans: TestPlanDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ testPlans: TestPlanDto[]; meta: any }>(
      `/projects/${projectId}/test-plans${queryString}`
    );
  }

  async getTestPlan(projectId: string, planId: string): Promise<TestPlanDto> {
    return this.request<TestPlanDto>(`/projects/${projectId}/test-plans/${planId}`);
  }

  async createTestPlan(projectId: string, payload: CreateTestPlanInput): Promise<TestPlanDto> {
    return this.request<TestPlanDto>(`/projects/${projectId}/test-plans`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTestPlan(
    projectId: string,
    planId: string,
    payload: UpdateTestPlanInput
  ): Promise<TestPlanDto> {
    return this.request<TestPlanDto>(`/projects/${projectId}/test-plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTestPlan(projectId: string, planId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/test-plans/${planId}`, {
      method: 'DELETE',
    });
  }

  async duplicateTestPlan(
    projectId: string,
    planId: string,
    payload: DuplicateTestPlanInput
  ): Promise<TestPlanDto> {
    return this.request<TestPlanDto>(`/projects/${projectId}/test-plans/${planId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPlanCases(
    projectId: string,
    planId: string
  ): Promise<{ planCases: TestPlanCaseDto[]; totalCount: number }> {
    return this.request<{ planCases: TestPlanCaseDto[]; totalCount: number }>(
      `/projects/${projectId}/test-plans/${planId}/cases`
    );
  }

  async selectPlanCases(
    projectId: string,
    planId: string,
    payload: SelectPlanCasesInput
  ): Promise<{ addedCount: number; planCases: TestPlanCaseDto[] }> {
    return this.request<{ addedCount: number; planCases: TestPlanCaseDto[] }>(
      `/projects/${projectId}/test-plans/${planId}/cases`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async removePlanCase(
    projectId: string,
    planId: string,
    caseId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/test-plans/${planId}/cases/${caseId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ----------------------------------------------------
  // TEST RUNS (Milestone 05)
  // ----------------------------------------------------
  async getTestRuns(
    projectId: string,
    params: {
      search?: string;
      status?: TestRunStatus;
      testPlanId?: string;
      milestoneId?: string;
      environmentId?: string;
      assignedToId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ testRuns: TestRunDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.testPlanId) query.set('testPlanId', params.testPlanId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.environmentId) query.set('environmentId', params.environmentId);
    if (params.assignedToId) query.set('assignedToId', params.assignedToId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ testRuns: TestRunDto[]; meta: any }>(
      `/projects/${projectId}/test-runs${queryString}`
    );
  }

  async getTestRun(projectId: string, runId: string): Promise<TestRunDto> {
    return this.request<TestRunDto>(`/projects/${projectId}/test-runs/${runId}`);
  }

  async createTestRun(projectId: string, payload: CreateTestRunInput): Promise<TestRunDto> {
    return this.request<TestRunDto>(`/projects/${projectId}/test-runs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTestRun(
    projectId: string,
    runId: string,
    payload: UpdateTestRunInput
  ): Promise<TestRunDto> {
    return this.request<TestRunDto>(`/projects/${projectId}/test-runs/${runId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTestRun(projectId: string, runId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/test-runs/${runId}`, {
      method: 'DELETE',
    });
  }

  async transitionRunStatus(
    projectId: string,
    runId: string,
    payload: TransitionRunStatusInput
  ): Promise<TestRunDto> {
    return this.request<TestRunDto>(`/projects/${projectId}/test-runs/${runId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRunCases(
    projectId: string,
    runId: string,
    params: {
      status?: ExecutionStatus;
      assignedToId?: string;
      search?: string;
    } = {}
  ): Promise<{ runCases: TestRunCaseDto[]; summary: any }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.assignedToId) query.set('assignedToId', params.assignedToId);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ runCases: TestRunCaseDto[]; summary: any }>(
      `/projects/${projectId}/test-runs/${runId}/cases${queryString}`
    );
  }

  async assignRunCases(
    projectId: string,
    runId: string,
    payload: AssignRunCasesInput
  ): Promise<{ assignedCount: number }> {
    return this.request<{ assignedCount: number }>(
      `/projects/${projectId}/test-runs/${runId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  // ----------------------------------------------------
  // TEST EXECUTION WORKBENCH (Milestone 05)
  // ----------------------------------------------------
  async getTestRunCase(
    projectId: string,
    runId: string,
    runCaseId: string
  ): Promise<TestRunCaseDto> {
    return this.request<TestRunCaseDto>(
      `/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}`
    );
  }

  async submitExecution(
    projectId: string,
    runId: string,
    runCaseId: string,
    payload: SubmitExecutionInput
  ): Promise<TestResultDto> {
    return this.request<TestResultDto>(
      `/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async retestExecution(
    projectId: string,
    runId: string,
    runCaseId: string,
    payload: RetestExecutionInput
  ): Promise<TestResultDto> {
    return this.request<TestResultDto>(
      `/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/retest`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getExecutionHistory(
    projectId: string,
    runId: string,
    runCaseId: string
  ): Promise<TestResultDto[]> {
    return this.request<TestResultDto[]>(
      `/projects/${projectId}/test-runs/${runId}/cases/${runCaseId}/history`
    );
  }

  // ----------------------------------------------------
  // ATTACHMENTS & EVIDENCE (Milestone 05)
  // ----------------------------------------------------
  async uploadAttachment(
    projectId: string,
    formData: FormData,
    testResultId?: string
  ): Promise<AttachmentDto> {
    const url = testResultId
      ? `${this.baseUrl}/projects/${projectId}/attachments?testResultId=${testResultId}`
      : `${this.baseUrl}/projects/${projectId}/attachments`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || 'Attachment upload failed');
    }
    return json.data;
  }

  getAttachmentDownloadUrl(projectId: string, attachmentId: string): string {
    return `${this.baseUrl}/projects/${projectId}/attachments/${attachmentId}/download`;
  }

  // ----------------------------------------------------
  // EXECUTION ANALYTICS (Milestone 05)
  // ----------------------------------------------------
  async getExecutionAnalytics(
    projectId: string,
    params: {
      testRunId?: string;
      testPlanId?: string;
      milestoneId?: string;
      environmentId?: string;
    } = {}
  ): Promise<ExecutionAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.testRunId) query.set('testRunId', params.testRunId);
    if (params.testPlanId) query.set('testPlanId', params.testPlanId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.environmentId) query.set('environmentId', params.environmentId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<ExecutionAnalyticsDto>(
      `/projects/${projectId}/execution-analytics${queryString}`
    );
  }
}

export const defaultApiClient = new ApiClient();
