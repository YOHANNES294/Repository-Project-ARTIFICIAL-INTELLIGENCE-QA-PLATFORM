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
  DefectSeverity,
  DefectPriority,
  DefectStatus,
  DefectType,
  DefectDto,
  DefectCommentDto,
  DefectHistoryDto,
  DefectTestLinkDto,
  DuplicateCandidateDto,
  DefectAnalyticsDto,
  CreateDefectInput,
  UpdateDefectInput,
  TransitionDefectStatusInput,
  AssignDefectInput,
  CreateDefectCommentInput,
  LinkDefectTestInput,
  AIProviderConfigDto,
  UpdateAIProviderConfigInput,
  AIGenerationDto,
  AIGenerationItemDto,
  AIFailureAnalysisDto,
  AIDuplicateAnalysisDto,
  AIRiskAnalysisDto,
  AIQAReportDto,
  AIFeedbackDto,
  GenerateTestCasesInput,
  AnalyzeFailureInput,
  AnalyzeDuplicateDefectInput,
  AnalyzeRiskInput,
  GenerateQAReportInput,
  ReviewAIGenerationItemInput,
  BatchReviewAIGenerationItemsInput,
  SubmitAIFeedbackInput,
  AITaskType,
  AutomationApiTokenDto,
  CreateAutomationTokenResponseDto,
  CreateAutomationTokenInput,
  AutomationSessionDto,
  CreateAutomationSessionInput,
  FinalizeAutomationSessionInput,
  IngestTestResultItemDto,
  AutomationTestMappingDto,
  CreateAutomationMappingInput,
  UpdateAutomationMappingInput,
  AutomationUnmappedTestDto,
  ResolveUnmappedTestInput,
  AutomationWebhookEventDto,
  ExecutiveDashboardMetricsDto,
  DetailedExecutionAnalyticsDto,
  CoverageAnalyticsDto,
  DetailedDefectAnalyticsDto,
  AutomationAnalyticsDto,
  MilestoneReleaseAnalyticsDto,
  AIIntelligenceAnalyticsDto,
  ProjectQualityGateDto,
  ReportDefinitionDto,
  ReportSnapshotDto,
  ReportScheduleDto,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput,
  CreateReportSnapshotInput,
  CreateReportScheduleInput,
  CreateProjectQualityGateInput,
  UpdateProjectQualityGateInput,
  ExportReportInput,
  NotificationDto,
  NotificationPreferenceDto,
  NotificationStatsDto,
  UpdateNotificationPreferencesInput,
  IntegrationDto,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  TestIntegrationInput,
  TestIntegrationResultDto,
  WebhookDto,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDeliveryDto,
  BillingPlanDto,
  SubscriptionDto,
  UsageSummaryDto,
  InvoiceDto,
  CheckoutSessionResultDto,
  CreateBillingPlanInput,
  UpdateBillingPlanInput,
  ChangeSubscriptionInput,
  CancelSubscriptionInput,
  CreatePaymentCheckoutInput,
  CreateUsageAdjustmentInput,
  PlatformOverviewMetricsDto,
  PlatformOrganizationListItemDto,
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

  private async requestWithMeta<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: any }> {
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

    return {
      data: json.data as T,
      meta: json.meta,
    };
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

  // ----------------------------------------------------
  // DEFECT MANAGEMENT (Milestone 06)
  // ----------------------------------------------------

  async getDefects(
    projectId: string,
    params: {
      search?: string;
      status?: DefectStatus;
      severity?: DefectSeverity;
      priority?: DefectPriority;
      type?: DefectType;
      assigneeId?: string;
      qaOwnerId?: string;
      reporterId?: string;
      environmentId?: string;
      milestoneId?: string;
      component?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ defects: DefectDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.severity) query.set('severity', params.severity);
    if (params.priority) query.set('priority', params.priority);
    if (params.type) query.set('type', params.type);
    if (params.assigneeId) query.set('assigneeId', params.assigneeId);
    if (params.qaOwnerId) query.set('qaOwnerId', params.qaOwnerId);
    if (params.reporterId) query.set('reporterId', params.reporterId);
    if (params.environmentId) query.set('environmentId', params.environmentId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.component) query.set('component', params.component);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ defects: DefectDto[]; meta: any }>(
      `/projects/${projectId}/defects${queryString}`
    );
  }

  async createDefect(projectId: string, payload: CreateDefectInput): Promise<DefectDto> {
    return this.request<DefectDto>(`/projects/${projectId}/defects`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDefect(projectId: string, defectId: string): Promise<DefectDto> {
    return this.request<DefectDto>(`/projects/${projectId}/defects/${defectId}`);
  }

  async updateDefect(
    projectId: string,
    defectId: string,
    payload: UpdateDefectInput
  ): Promise<DefectDto> {
    return this.request<DefectDto>(`/projects/${projectId}/defects/${defectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteDefect(projectId: string, defectId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${projectId}/defects/${defectId}`, {
      method: 'DELETE',
    });
  }

  async transitionDefectStatus(
    projectId: string,
    defectId: string,
    payload: TransitionDefectStatusInput
  ): Promise<DefectDto> {
    return this.request<DefectDto>(`/projects/${projectId}/defects/${defectId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async assignDefect(
    projectId: string,
    defectId: string,
    payload: AssignDefectInput
  ): Promise<DefectDto> {
    return this.request<DefectDto>(`/projects/${projectId}/defects/${defectId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDefectDuplicateCandidates(
    projectId: string,
    params: { title: string; component?: string; environmentId?: string }
  ): Promise<DuplicateCandidateDto[]> {
    const query = new URLSearchParams();
    query.set('title', params.title);
    if (params.component) query.set('component', params.component);
    if (params.environmentId) query.set('environmentId', params.environmentId);

    return this.request<DuplicateCandidateDto[]>(
      `/projects/${projectId}/defects/duplicate-candidates?${query.toString()}`
    );
  }

  async linkDefectTest(
    projectId: string,
    defectId: string,
    payload: LinkDefectTestInput
  ): Promise<DefectTestLinkDto> {
    return this.request<DefectTestLinkDto>(`/projects/${projectId}/defects/${defectId}/links`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async unlinkDefectTest(
    projectId: string,
    defectId: string,
    linkId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/defects/${defectId}/links/${linkId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getDefectComments(projectId: string, defectId: string): Promise<DefectCommentDto[]> {
    return this.request<DefectCommentDto[]>(`/projects/${projectId}/defects/${defectId}/comments`);
  }

  async addDefectComment(
    projectId: string,
    defectId: string,
    payload: CreateDefectCommentInput
  ): Promise<DefectCommentDto> {
    return this.request<DefectCommentDto>(`/projects/${projectId}/defects/${defectId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteDefectComment(
    projectId: string,
    defectId: string,
    commentId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/defects/${defectId}/comments/${commentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getDefectHistory(projectId: string, defectId: string): Promise<DefectHistoryDto[]> {
    return this.request<DefectHistoryDto[]>(`/projects/${projectId}/defects/${defectId}/history`);
  }

  async getDefectAnalytics(
    projectId: string,
    params: { milestoneId?: string; environmentId?: string } = {}
  ): Promise<DefectAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.environmentId) query.set('environmentId', params.environmentId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<DefectAnalyticsDto>(
      `/projects/${projectId}/defects/analytics${queryString}`
    );
  }

  // ----------------------------------------------------
  // MILESTONE 07: AI INTELLIGENCE ENGINE ENDPOINTS
  // ----------------------------------------------------

  async getAIProviderConfig(projectId: string): Promise<AIProviderConfigDto> {
    return this.request<AIProviderConfigDto>(`/projects/${projectId}/ai/provider`);
  }

  async updateAIProviderConfig(
    projectId: string,
    payload: UpdateAIProviderConfigInput
  ): Promise<AIProviderConfigDto> {
    return this.request<AIProviderConfigDto>(`/projects/${projectId}/ai/provider`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async testAIProviderConnection(
    projectId: string
  ): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    return this.request<{ success: boolean; latencyMs: number; message?: string }>(
      `/projects/${projectId}/ai/provider/test`,
      {
        method: 'POST',
      }
    );
  }

  async getAIUsageMetrics(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/ai/usage`);
  }

  async generateTestCases(
    projectId: string,
    payload: GenerateTestCasesInput
  ): Promise<AIGenerationDto> {
    return this.request<AIGenerationDto>(`/projects/${projectId}/ai/generate-tests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listAIGenerations(
    projectId: string,
    taskType?: AITaskType
  ): Promise<AIGenerationDto[]> {
    const query = taskType ? `?taskType=${taskType}` : '';
    return this.request<AIGenerationDto[]>(`/projects/${projectId}/ai/generations${query}`);
  }

  async getAIGeneration(
    projectId: string,
    generationId: string
  ): Promise<AIGenerationDto> {
    return this.request<AIGenerationDto>(`/projects/${projectId}/ai/generations/${generationId}`);
  }

  async reviewAIGenerationItem(
    projectId: string,
    generationId: string,
    itemId: string,
    payload: ReviewAIGenerationItemInput
  ): Promise<AIGenerationItemDto> {
    return this.request<AIGenerationItemDto>(
      `/projects/${projectId}/ai/generations/${generationId}/items/${itemId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async batchReviewAIGenerationItems(
    projectId: string,
    generationId: string,
    payload: BatchReviewAIGenerationItemsInput
  ): Promise<{ reviewedCount: number; results: AIGenerationItemDto[] }> {
    return this.request<{ reviewedCount: number; results: AIGenerationItemDto[] }>(
      `/projects/${projectId}/ai/generations/${generationId}/batch-review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async analyzeTestFailure(
    projectId: string,
    payload: AnalyzeFailureInput
  ): Promise<AIFailureAnalysisDto> {
    return this.request<AIFailureAnalysisDto>(`/projects/${projectId}/ai/analyze-failure`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async analyzeDuplicateDefect(
    projectId: string,
    payload: AnalyzeDuplicateDefectInput
  ): Promise<AIDuplicateAnalysisDto> {
    return this.request<AIDuplicateAnalysisDto>(`/projects/${projectId}/ai/duplicate-intelligence`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async analyzeRisk(
    projectId: string,
    payload: AnalyzeRiskInput
  ): Promise<AIRiskAnalysisDto> {
    return this.request<AIRiskAnalysisDto>(`/projects/${projectId}/ai/risk-analysis`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateQAReport(
    projectId: string,
    payload: GenerateQAReportInput
  ): Promise<AIQAReportDto> {
    return this.request<AIQAReportDto>(`/projects/${projectId}/ai/qa-report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitAIFeedback(
    projectId: string,
    generationId: string,
    payload: SubmitAIFeedbackInput
  ): Promise<AIFeedbackDto> {
    return this.request<AIFeedbackDto>(
      `/projects/${projectId}/ai/generations/${generationId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getAIFeedback(
    projectId: string,
    generationId: string
  ): Promise<AIFeedbackDto[]> {
    return this.request<AIFeedbackDto[]>(
      `/projects/${projectId}/ai/generations/${generationId}/feedback`
    );
  }

  // ----------------------------------------------------
  // MILESTONE 08: AUTOMATION & CI/CD CLIENT METHODS
  // ----------------------------------------------------

  async getAutomationOverview(projectId: string): Promise<{
    totalSessions: number;
    totalMappings: number;
    totalUnmapped: number;
    activeTokens: number;
    recentSessions: AutomationSessionDto[];
  }> {
    return this.request<{
      totalSessions: number;
      totalMappings: number;
      totalUnmapped: number;
      activeTokens: number;
      recentSessions: AutomationSessionDto[];
    }>(`/projects/${projectId}/automation/overview`);
  }

  async getAutomationTokens(projectId: string): Promise<AutomationApiTokenDto[]> {
    return this.request<AutomationApiTokenDto[]>(`/projects/${projectId}/automation/tokens`);
  }

  async createAutomationToken(
    projectId: string,
    payload: CreateAutomationTokenInput
  ): Promise<CreateAutomationTokenResponseDto> {
    return this.request<CreateAutomationTokenResponseDto>(
      `/projects/${projectId}/automation/tokens`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async revokeAutomationToken(
    projectId: string,
    tokenId: string
  ): Promise<AutomationApiTokenDto> {
    return this.request<AutomationApiTokenDto>(
      `/projects/${projectId}/automation/tokens/${tokenId}`,
      { method: 'DELETE' }
    );
  }

  async getAutomationSessions(
    projectId: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ sessions: AutomationSessionDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status) query.set('status', params.status);

    const qs = query.toString();
    const endpoint = `/projects/${projectId}/automation/sessions${qs ? `?${qs}` : ''}`;

    const res = await this.requestWithMeta<AutomationSessionDto[]>(endpoint);
    return {
      sessions: res.data,
      meta: res.meta,
    };
  }

  async getAutomationSession(
    projectId: string,
    sessionId: string
  ): Promise<AutomationSessionDto> {
    return this.request<AutomationSessionDto>(
      `/projects/${projectId}/automation/sessions/${sessionId}`
    );
  }

  async createAutomationSession(
    projectId: string,
    payload: CreateAutomationSessionInput
  ): Promise<AutomationSessionDto> {
    return this.request<AutomationSessionDto>(
      `/projects/${projectId}/automation/sessions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async ingestAutomationResults(
    projectId: string,
    sessionId: string,
    results: IngestTestResultItemDto[]
  ): Promise<{ processedCount: number; unmappedCount: number; session: AutomationSessionDto }> {
    return this.request<{
      processedCount: number;
      unmappedCount: number;
      session: AutomationSessionDto;
    }>(`/projects/${projectId}/automation/sessions/${sessionId}/results`, {
      method: 'POST',
      body: JSON.stringify({ results }),
    });
  }

  async finalizeAutomationSession(
    projectId: string,
    sessionId: string,
    payload: FinalizeAutomationSessionInput = { sessionId }
  ): Promise<AutomationSessionDto> {
    return this.request<AutomationSessionDto>(
      `/projects/${projectId}/automation/sessions/${sessionId}/finalize`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async ingestNewmanReport(
    projectId: string,
    report: any
  ): Promise<{ session: AutomationSessionDto; totalItems: number; processed: number; unmapped: number }> {
    return this.request<{
      session: AutomationSessionDto;
      totalItems: number;
      processed: number;
      unmapped: number;
    }>(`/projects/${projectId}/automation/ingest/newman`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async ingestPlaywrightReport(
    projectId: string,
    report: any
  ): Promise<{ session: AutomationSessionDto; totalItems: number; processed: number; unmapped: number }> {
    return this.request<{
      session: AutomationSessionDto;
      totalItems: number;
      processed: number;
      unmapped: number;
    }>(`/projects/${projectId}/automation/ingest/playwright`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async getAutomationMappings(
    projectId: string,
    params: { framework?: string; search?: string; page?: number; limit?: number } = {}
  ): Promise<{ mappings: AutomationTestMappingDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.framework) query.set('framework', params.framework);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/projects/${projectId}/automation/mappings${qs ? `?${qs}` : ''}`;

    const res = await this.requestWithMeta<AutomationTestMappingDto[]>(endpoint);
    return {
      mappings: res.data,
      meta: res.meta,
    };
  }

  async createAutomationMapping(
    projectId: string,
    payload: CreateAutomationMappingInput
  ): Promise<AutomationTestMappingDto> {
    return this.request<AutomationTestMappingDto>(
      `/projects/${projectId}/automation/mappings`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async updateAutomationMapping(
    projectId: string,
    mappingId: string,
    payload: UpdateAutomationMappingInput
  ): Promise<AutomationTestMappingDto> {
    return this.request<AutomationTestMappingDto>(
      `/projects/${projectId}/automation/mappings/${mappingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }

  async deleteAutomationMapping(
    projectId: string,
    mappingId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/automation/mappings/${mappingId}`,
      { method: 'DELETE' }
    );
  }

  async getAutomationUnmappedTests(
    projectId: string,
    params: { sessionId?: string; status?: string; page?: number; limit?: number } = {}
  ): Promise<{ unmapped: AutomationUnmappedTestDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.sessionId) query.set('sessionId', params.sessionId);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/projects/${projectId}/automation/unmapped${qs ? `?${qs}` : ''}`;

    const res = await this.requestWithMeta<AutomationUnmappedTestDto[]>(endpoint);
    return {
      unmapped: res.data,
      meta: res.meta,
    };
  }

  async resolveAutomationUnmappedTest(
    projectId: string,
    unmappedId: string,
    payload: ResolveUnmappedTestInput
  ): Promise<AutomationTestMappingDto | { status: string }> {
    return this.request<AutomationTestMappingDto | { status: string }>(
      `/projects/${projectId}/automation/unmapped/${unmappedId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getAutomationWebhooks(
    projectId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ events: AutomationWebhookEventDto[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/projects/${projectId}/automation/webhooks${qs ? `?${qs}` : ''}`;

    const res = await this.requestWithMeta<AutomationWebhookEventDto[]>(endpoint);
    return {
      events: res.data,
      meta: res.meta,
    };
  }

  // ----------------------------------------------------
  // ADVANCED ANALYTICS & REPORTING (Milestone 09)
  // ----------------------------------------------------
  async getExecutiveAnalytics(
    projectId: string,
    params: { startDate?: string; endDate?: string; environmentId?: string; milestoneId?: string } = {}
  ): Promise<ExecutiveDashboardMetricsDto> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.environmentId) query.set('environmentId', params.environmentId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);

    const qs = query.toString();
    return this.request<ExecutiveDashboardMetricsDto>(
      `/projects/${projectId}/analytics/executive${qs ? `?${qs}` : ''}`
    );
  }

  async getExecutiveDashboard(
    projectId: string,
    params: { startDate?: string; endDate?: string; environmentId?: string; milestoneId?: string } = {}
  ): Promise<ExecutiveDashboardMetricsDto> {
    return this.getExecutiveAnalytics(projectId, params);
  }

  async getDetailedExecutionAnalytics(
    projectId: string,
    params: { startDate?: string; endDate?: string; environmentId?: string; milestoneId?: string } = {}
  ): Promise<DetailedExecutionAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.environmentId) query.set('environmentId', params.environmentId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);

    const qs = query.toString();
    return this.request<DetailedExecutionAnalyticsDto>(
      `/projects/${projectId}/analytics/executions${qs ? `?${qs}` : ''}`
    );
  }

  async getCoverageAnalytics(
    projectId: string,
    params: { milestoneId?: string } = {}
  ): Promise<CoverageAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);

    const qs = query.toString();
    return this.request<CoverageAnalyticsDto>(
      `/projects/${projectId}/analytics/coverage${qs ? `?${qs}` : ''}`
    );
  }

  async getDetailedDefectAnalytics(
    projectId: string,
    params: { startDate?: string; endDate?: string; environmentId?: string; milestoneId?: string; component?: string } = {}
  ): Promise<DetailedDefectAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.environmentId) query.set('environmentId', params.environmentId);
    if (params.milestoneId) query.set('milestoneId', params.milestoneId);
    if (params.component) query.set('component', params.component);

    const qs = query.toString();
    return this.request<DetailedDefectAnalyticsDto>(
      `/projects/${projectId}/analytics/defects${qs ? `?${qs}` : ''}`
    );
  }

  async getAutomationAnalytics(
    projectId: string,
    params: { startDate?: string; endDate?: string; framework?: string; ciProvider?: string } = {}
  ): Promise<AutomationAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.framework) query.set('framework', params.framework);
    if (params.ciProvider) query.set('ciProvider', params.ciProvider);

    const qs = query.toString();
    return this.request<AutomationAnalyticsDto>(
      `/projects/${projectId}/analytics/automation${qs ? `?${qs}` : ''}`
    );
  }

  async getMilestoneReleaseAnalytics(
    projectId: string,
    milestoneId: string
  ): Promise<MilestoneReleaseAnalyticsDto> {
    return this.request<MilestoneReleaseAnalyticsDto>(
      `/projects/${projectId}/analytics/milestones/${milestoneId}`
    );
  }

  async getAIAnalytics(
    projectId: string,
    params: { startDate?: string; endDate?: string; provider?: string } = {}
  ): Promise<AIIntelligenceAnalyticsDto> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.provider) query.set('provider', params.provider);

    const qs = query.toString();
    return this.request<AIIntelligenceAnalyticsDto>(
      `/projects/${projectId}/analytics/ai${qs ? `?${qs}` : ''}`
    );
  }

  // Quality Gates
  async getQualityGates(projectId: string): Promise<ProjectQualityGateDto[]> {
    return this.request<ProjectQualityGateDto[]>(`/projects/${projectId}/analytics/quality-gates`);
  }

  async createQualityGate(
    projectId: string,
    payload: CreateProjectQualityGateInput
  ): Promise<ProjectQualityGateDto> {
    return this.request<ProjectQualityGateDto>(`/projects/${projectId}/analytics/quality-gates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateQualityGate(
    projectId: string,
    gateId: string,
    payload: UpdateProjectQualityGateInput
  ): Promise<ProjectQualityGateDto> {
    return this.request<ProjectQualityGateDto>(
      `/projects/${projectId}/analytics/quality-gates/${gateId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  }

  async deleteQualityGate(projectId: string, gateId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/analytics/quality-gates/${gateId}`,
      { method: 'DELETE' }
    );
  }

  // Report Definitions
  async getReportDefinitions(projectId: string): Promise<ReportDefinitionDto[]> {
    return this.request<ReportDefinitionDto[]>(`/projects/${projectId}/analytics/reports`);
  }

  async getReportDefinition(projectId: string, reportId: string): Promise<ReportDefinitionDto> {
    return this.request<ReportDefinitionDto>(`/projects/${projectId}/analytics/reports/${reportId}`);
  }

  async createReportDefinition(
    projectId: string,
    payload: CreateReportDefinitionInput
  ): Promise<ReportDefinitionDto> {
    return this.request<ReportDefinitionDto>(`/projects/${projectId}/analytics/reports`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateReportDefinition(
    projectId: string,
    reportId: string,
    payload: UpdateReportDefinitionInput
  ): Promise<ReportDefinitionDto> {
    return this.request<ReportDefinitionDto>(`/projects/${projectId}/analytics/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteReportDefinition(projectId: string, reportId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/analytics/reports/${reportId}`,
      { method: 'DELETE' }
    );
  }

  async runReport(
    projectId: string,
    payload: { reportType: string; filters?: Record<string, unknown> }
  ): Promise<any> {
    return this.request<any>(`/projects/${projectId}/analytics/reports/run`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Report Snapshots
  async getReportSnapshots(projectId: string): Promise<ReportSnapshotDto[]> {
    return this.request<ReportSnapshotDto[]>(`/projects/${projectId}/analytics/reports/snapshots/list`);
  }

  async getReportSnapshot(projectId: string, snapshotId: string): Promise<ReportSnapshotDto> {
    return this.request<ReportSnapshotDto>(
      `/projects/${projectId}/analytics/reports/snapshots/${snapshotId}`
    );
  }

  async createReportSnapshot(
    projectId: string,
    payload: CreateReportSnapshotInput
  ): Promise<ReportSnapshotDto> {
    return this.request<ReportSnapshotDto>(`/projects/${projectId}/analytics/reports/snapshots`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Report Schedules
  async getReportSchedules(projectId: string): Promise<ReportScheduleDto[]> {
    return this.request<ReportScheduleDto[]>(`/projects/${projectId}/analytics/reports/schedules/list`);
  }

  async createReportSchedule(
    projectId: string,
    payload: CreateReportScheduleInput
  ): Promise<ReportScheduleDto> {
    return this.request<ReportScheduleDto>(`/projects/${projectId}/analytics/reports/schedules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async triggerReportSchedule(projectId: string, scheduleId: string): Promise<any> {
    return this.request<any>(
      `/projects/${projectId}/analytics/reports/schedules/${scheduleId}/run`,
      { method: 'POST' }
    );
  }

  async deleteReportSchedule(projectId: string, scheduleId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/projects/${projectId}/analytics/reports/schedules/${scheduleId}`,
      { method: 'DELETE' }
    );
  }

  // Export
  async exportReport(
    projectId: string,
    payload: ExportReportInput
  ): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/projects/${projectId}/analytics/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Export failed with HTTP ${res.status}`);
    }
    return res.blob();
  }

  // ====================================================
  // MILESTONE 10 — NOTIFICATIONS & EXTERNAL INTEGRATIONS
  // ====================================================

  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: string;
    category?: string;
    priority?: string;
    search?: string;
  }): Promise<{ items: NotificationDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.isRead) query.set('isRead', params.isRead);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    const endpoint = `/notifications${qs ? `?${qs}` : ''}`;
    const res = await this.request<any>(endpoint);
    return {
      items: res.data || [],
      total: res.meta?.total || 0,
      page: res.meta?.page || 1,
      limit: res.meta?.limit || 20,
      totalPages: res.meta?.totalPages || 1,
    };
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationAsRead(id: string): Promise<NotificationDto> {
    return this.request<NotificationDto>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead(organizationId?: string): Promise<{ count: number }> {
    const qs = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request<{ count: number }>(`/notifications/mark-all-read${qs}`, {
      method: 'POST',
    });
  }

  async deleteNotification(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return this.request<NotificationPreferenceDto>('/notifications/preferences');
  }

  async updateNotificationPreferences(
    payload: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferenceDto> {
    return this.request<NotificationPreferenceDto>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async resetNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return this.request<NotificationPreferenceDto>('/notifications/preferences/reset', {
      method: 'POST',
    });
  }

  async getNotificationDeliveryStats(organizationId?: string): Promise<NotificationStatsDto> {
    const qs = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request<NotificationStatsDto>(`/notifications/admin/stats${qs}`);
  }

  async testNotificationDispatch(payload?: {
    title?: string;
    message?: string;
    category?: string;
    priority?: string;
  }): Promise<any> {
    return this.request<any>('/notifications/test-dispatch', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  // Integrations
  async getProjectIntegrations(projectId: string): Promise<IntegrationDto[]> {
    return this.request<IntegrationDto[]>(`/projects/${projectId}/integrations`);
  }

  async getOrgIntegrations(orgId: string): Promise<IntegrationDto[]> {
    return this.request<IntegrationDto[]>(`/organizations/${orgId}/integrations`);
  }

  async createProjectIntegration(
    projectId: string,
    payload: CreateIntegrationInput
  ): Promise<IntegrationDto> {
    return this.request<IntegrationDto>(`/projects/${projectId}/integrations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateIntegration(
    id: string,
    payload: UpdateIntegrationInput,
    projectId?: string
  ): Promise<IntegrationDto> {
    const prefix = projectId ? `/projects/${projectId}/integrations` : `/notifications/integrations`;
    return this.request<IntegrationDto>(`${prefix}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteIntegration(id: string, projectId?: string): Promise<{ message: string }> {
    const prefix = projectId ? `/projects/${projectId}/integrations` : `/notifications/integrations`;
    return this.request<{ message: string }>(`${prefix}/${id}`, {
      method: 'DELETE',
    });
  }

  async testIntegration(payload: TestIntegrationInput, projectId?: string): Promise<TestIntegrationResultDto> {
    const prefix = projectId ? `/projects/${projectId}/integrations` : `/notifications/integrations`;
    return this.request<TestIntegrationResultDto>(`${prefix}/test`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Webhooks
  async getProjectWebhooks(projectId: string): Promise<WebhookDto[]> {
    return this.request<WebhookDto[]>(`/projects/${projectId}/webhooks`);
  }

  async createProjectWebhook(
    projectId: string,
    payload: CreateWebhookInput
  ): Promise<WebhookDto & { rawSecret: string }> {
    return this.request<WebhookDto & { rawSecret: string }>(`/projects/${projectId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateWebhook(
    id: string,
    payload: UpdateWebhookInput,
    projectId?: string
  ): Promise<WebhookDto> {
    const prefix = projectId ? `/projects/${projectId}/webhooks` : `/webhooks`;
    return this.request<WebhookDto>(`${prefix}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteWebhook(id: string, projectId?: string): Promise<{ message: string }> {
    const prefix = projectId ? `/projects/${projectId}/webhooks` : `/webhooks`;
    return this.request<{ message: string }>(`${prefix}/${id}`, {
      method: 'DELETE',
    });
  }

  async rotateWebhookSecret(id: string, projectId?: string): Promise<{ newSecret: string }> {
    const prefix = projectId ? `/projects/${projectId}/webhooks` : `/webhooks`;
    return this.request<{ newSecret: string }>(`${prefix}/${id}/rotate-secret`, {
      method: 'POST',
    });
  }

  async getWebhookDeliveries(
    webhookId: string,
    projectId?: string,
    limit?: number
  ): Promise<WebhookDeliveryDto[]> {
    const prefix = projectId ? `/projects/${projectId}/webhooks` : `/webhooks`;
    const qs = limit ? `?limit=${limit}` : '';
    return this.request<WebhookDeliveryDto[]>(`${prefix}/${webhookId}/deliveries${qs}`);
  }

  async retryWebhookDelivery(
    webhookId: string,
    deliveryId: string,
    projectId?: string
  ): Promise<WebhookDeliveryDto> {
    const prefix = projectId ? `/projects/${projectId}/webhooks` : `/webhooks`;
    return this.request<WebhookDeliveryDto>(`${prefix}/${webhookId}/deliveries/${deliveryId}/retry`, {
      method: 'POST',
    });
  }

  // ----------------------------------------------------
  // BILLING & SAAS ADMINISTRATION (MILESTONE 11)
  // ----------------------------------------------------

  async getSubscription(orgId?: string): Promise<SubscriptionDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing` : '/billing';
    return this.request<SubscriptionDto>(prefix);
  }

  async getBillingPlans(): Promise<BillingPlanDto[]> {
    return this.request<BillingPlanDto[]>('/billing/plans');
  }

  async getUsageSummary(orgId?: string): Promise<UsageSummaryDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/usage` : '/billing/usage';
    return this.request<UsageSummaryDto>(prefix);
  }

  async changeSubscription(payload: ChangeSubscriptionInput, orgId?: string): Promise<SubscriptionDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/subscription` : '/billing/subscription';
    return this.request<SubscriptionDto>(prefix, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async cancelSubscription(payload: CancelSubscriptionInput, orgId?: string): Promise<SubscriptionDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/subscription/cancel` : '/billing/subscription/cancel';
    return this.request<SubscriptionDto>(prefix, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reactivateSubscription(orgId?: string): Promise<SubscriptionDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/subscription/reactivate` : '/billing/subscription/reactivate';
    return this.request<SubscriptionDto>(prefix, {
      method: 'POST',
    });
  }

  async createCheckoutSession(payload: CreatePaymentCheckoutInput, orgId?: string): Promise<CheckoutSessionResultDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/checkout` : '/billing/checkout';
    return this.request<CheckoutSessionResultDto>(prefix, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInvoices(orgId?: string): Promise<InvoiceDto[]> {
    const prefix = orgId ? `/organizations/${orgId}/billing/invoices` : '/billing/invoices';
    return this.request<InvoiceDto[]>(prefix);
  }

  async getInvoiceById(invoiceId: string, orgId?: string): Promise<InvoiceDto> {
    const prefix = orgId ? `/organizations/${orgId}/billing/invoices/${invoiceId}` : `/billing/invoices/${invoiceId}`;
    return this.request<InvoiceDto>(prefix);
  }

  async adjustUsage(payload: CreateUsageAdjustmentInput, orgId?: string): Promise<any> {
    const prefix = orgId ? `/organizations/${orgId}/billing/usage/adjust` : '/billing/usage/adjust';
    return this.request<any>(prefix, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Platform Super Administration
  async getPlatformOverview(): Promise<PlatformOverviewMetricsDto> {
    return this.request<PlatformOverviewMetricsDto>('/platform/overview');
  }

  async getPlatformOrganizations(params: {
    search?: string;
    page?: number;
    limit?: number;
    isSuspended?: boolean;
  } = {}): Promise<{ data: PlatformOrganizationListItemDto[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.isSuspended !== undefined) query.set('isSuspended', String(params.isSuspended));
    const qs = query.toString();
    return this.requestWithMeta<PlatformOrganizationListItemDto[]>(`/platform/organizations${qs ? `?${qs}` : ''}`);
  }

  async getPlatformOrganizationDetails(orgId: string): Promise<any> {
    return this.request<any>(`/platform/organizations/${orgId}`);
  }

  async suspendOrganization(orgId: string, reason: string): Promise<any> {
    return this.request<any>(`/platform/organizations/${orgId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateOrganization(orgId: string): Promise<any> {
    return this.request<any>(`/platform/organizations/${orgId}/reactivate`, {
      method: 'POST',
    });
  }

  async getPlatformUsers(params: {
    search?: string;
    page?: number;
    limit?: number;
    isSuspended?: boolean;
  } = {}): Promise<{ data: any[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.isSuspended !== undefined) query.set('isSuspended', String(params.isSuspended));
    const qs = query.toString();
    return this.requestWithMeta<any[]>(`/platform/users${qs ? `?${qs}` : ''}`);
  }

  async suspendUser(userId: string, reason: string): Promise<any> {
    return this.request<any>(`/platform/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateUser(userId: string): Promise<any> {
    return this.request<any>(`/platform/users/${userId}/reactivate`, {
      method: 'POST',
    });
  }

  async getPlatformPlans(): Promise<BillingPlanDto[]> {
    return this.request<BillingPlanDto[]>('/platform/plans');
  }

  async createPlatformPlan(payload: CreateBillingPlanInput): Promise<BillingPlanDto> {
    return this.request<BillingPlanDto>('/platform/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updatePlatformPlan(planId: string, payload: UpdateBillingPlanInput): Promise<BillingPlanDto> {
    return this.request<BillingPlanDto>(`/platform/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getPlatformSystemHealth(): Promise<any> {
    return this.request<any>('/platform/system/health');
  }
}

export const defaultApiClient = new ApiClient();
