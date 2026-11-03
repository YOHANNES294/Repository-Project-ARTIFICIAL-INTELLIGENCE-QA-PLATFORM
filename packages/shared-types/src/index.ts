// Organization and Role Enums
export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  QA_MANAGER = 'QA_MANAGER',
  QA_ENGINEER = 'QA_ENGINEER',
  AUTOMATION_ENGINEER = 'AUTOMATION_ENGINEER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

// Project Status
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Project Role
export enum ProjectRole {
  PROJECT_LEAD = 'PROJECT_LEAD',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// Milestone Status
export enum MilestoneStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
}

// Test Case Status
export enum TestCaseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

// Test Plan Status
export enum TestPlanStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Test Run Status
export enum TestRunStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

// Test Types
export enum TestType {
  FUNCTIONAL = 'FUNCTIONAL',
  REGRESSION = 'REGRESSION',
  SMOKE = 'SMOKE',
  SANITY = 'SANITY',
  INTEGRATION = 'INTEGRATION',
  SYSTEM = 'SYSTEM',
  ACCEPTANCE = 'ACCEPTANCE',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  USABILITY = 'USABILITY',
  ACCESSIBILITY = 'ACCESSIBILITY',
  EXPLORATORY = 'EXPLORATORY',
}

// Test Priorities
export enum TestPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Execution Statuses
export enum ExecutionStatus {
  NOT_RUN = 'NOT_RUN',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
  RETEST = 'RETEST',
}

// Defect Severity
export enum DefectSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MAJOR = 'MAJOR',
  MEDIUM = 'MEDIUM',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
  MINOR = 'MINOR',
  TRIVIAL = 'TRIVIAL',
}

// Defect Priority
export enum DefectPriority {
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Defect Lifecycle Status
export enum DefectStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  TRIAGED = 'TRIAGED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  FIXED = 'FIXED',
  READY_FOR_RETEST = 'READY_FOR_RETEST',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  REJECTED = 'REJECTED',
  DUPLICATE = 'DUPLICATE',
}

// Defect Types
export enum DefectType {
  FUNCTIONAL = 'FUNCTIONAL',
  UI = 'UI',
  API = 'API',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  ACCESSIBILITY = 'ACCESSIBILITY',
  DATA = 'DATA',
  INTEGRATION = 'INTEGRATION',
  OTHER = 'OTHER',
}

// SaaS Billing Plans
export enum BillingTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

// AI Providers
export enum AIProviderType {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  MOCK = 'MOCK',
  CUSTOM = 'CUSTOM',
}

// Standard API Response Contracts
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    redis: 'connected' | 'disconnected' | 'unknown';
    worker: 'running' | 'idle' | 'stopped';
  };
}

export interface ProjectDto {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string | null;
  objectives: string | null;
  status: ProjectStatus;
  isArchived: boolean;
  archivedAt: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members?: number;
    environments?: number;
    testCases?: number;
    testRuns?: number;
    defects?: number;
  };
}

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface EnvironmentDto {
  id: string;
  projectId: string;
  name: string;
  type: string;
  url: string | null;
  description: string | null;
  variables?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// MILESTONE & TEST MANAGEMENT DTOS (Milestone 04)
// ----------------------------------------------------

export interface MilestoneProgressDto {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  blockedRuns: number;
  skippedRuns: number;
  totalCases: number;
  completionPercentage: number;
  openDefects: number;
}

export interface MilestoneDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  objectives: string | null;
  status: MilestoneStatus;
  priority: TestPriority;
  releaseVer: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  ownerId: string | null;
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  progress?: MilestoneProgressDto;
  _count?: {
    testPlans: number;
    testRuns: number;
    testCases: number;
    defects: number;
  };
}

export interface TestSuiteDto {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  objectives: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  children?: TestSuiteDto[];
  _count?: {
    testCases: number;
    children: number;
  };
}

export interface TagDto {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: {
    testCases: number;
  };
}

export interface TestStepDto {
  id?: string;
  testCaseVersionId?: string;
  stepNumber: number;
  action: string;
  testData: string | null;
  expectedResult: string;
}

export interface TestCaseVersionDto {
  id: string;
  testCaseId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  preconditions: string | null;
  objectives: string | null;
  priority: TestPriority;
  type: TestType;
  status: TestCaseStatus;
  changeSummary: string | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  steps: TestStepDto[];
}

export interface TestCaseDto {
  id: string;
  projectId: string;
  suiteId: string | null;
  milestoneId: string | null;
  caseNumber: number;
  key?: string; // e.g. "CORE-101"
  title: string;
  description: string | null;
  preconditions: string | null;
  objectives: string | null;
  priority: TestPriority;
  type: TestType;
  status: TestCaseStatus;
  estimatedTimeMin: number | null;
  isArchived: boolean;
  currentVersion: number;
  authorId: string | null;
  author?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  tags: TagDto[];
  suite?: {
    id: string;
    name: string;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
  currentVersionDetails?: TestCaseVersionDto;
  createdAt: string;
  updatedAt: string;
}

export interface VersionDiffDto {
  versionA: number;
  versionB: number;
  titleChanged: boolean;
  descriptionChanged: boolean;
  preconditionsChanged: boolean;
  objectivesChanged: boolean;
  priorityChanged: boolean;
  typeChanged: boolean;
  statusChanged: boolean;
  stepsChanged: boolean;
  detailsA: TestCaseVersionDto;
  detailsB: TestCaseVersionDto;
}

export interface CsvImportRowData {
  title: string;
  description?: string;
  preconditions?: string;
  objectives?: string;
  priority?: string;
  type?: string;
  status?: string;
  estimatedTimeMin?: number;
  suiteName?: string;
  tags?: string[];
  steps?: Array<{
    stepNumber: number;
    action: string;
    testData?: string;
    expectedResult: string;
  }>;
}

export interface CsvImportPreviewRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  data: CsvImportRowData;
}

export interface CsvImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: CsvImportPreviewRow[];
}

export interface CsvBulkImportInput {
  rows: CsvImportRowData[];
  defaultSuiteId?: string | null;
  defaultMilestoneId?: string | null;
}

// ----------------------------------------------------
// MILESTONE 05: TEST PLANNING & EXECUTION DTOS
// ----------------------------------------------------

export interface TestPlanDto {
  id: string;
  projectId: string;
  planNumber: number;
  key?: string; // e.g. "CORE-TP-1"
  milestoneId: string | null;
  environmentId: string | null;
  managerId: string | null;
  name: string;
  description: string | null;
  objectives: string | null;
  scope: string | null;
  strategy: string | null;
  status: TestPlanStatus;
  priority: TestPriority;
  entryCriteria: string | null;
  exitCriteria: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  milestone?: {
    id: string;
    name: string;
  } | null;
  environment?: {
    id: string;
    name: string;
  } | null;
  manager?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    selectedCases: number;
    testRuns: number;
  };
  selectedCases?: TestPlanCaseDto[];
}

export interface TestPlanCaseDto {
  id: string;
  testPlanId: string;
  testCaseId: string;
  testCaseVersionId: string | null;
  createdAt: string;
  testCase?: TestCaseDto;
  testCaseVersion?: TestCaseVersionDto | null;
}

export interface CreateTestPlanInput {
  name: string;
  description?: string | null;
  objectives?: string | null;
  scope?: string | null;
  strategy?: string | null;
  status?: TestPlanStatus | any;
  priority?: TestPriority | any;
  milestoneId?: string | null;
  environmentId?: string | null;
  managerId?: string | null;
  entryCriteria?: string | null;
  exitCriteria?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateTestPlanInput {
  name?: string;
  description?: string | null;
  objectives?: string | null;
  scope?: string | null;
  strategy?: string | null;
  status?: TestPlanStatus | any;
  priority?: TestPriority | any;
  milestoneId?: string | null;
  environmentId?: string | null;
  managerId?: string | null;
  entryCriteria?: string | null;
  exitCriteria?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SelectPlanCasesInput {
  testCaseIds: string[];
}

export interface DuplicateTestPlanInput {
  name: string;
  includeCases?: boolean;
}

export interface ExecutionSummaryDto {
  total: number;
  notRun: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passPercentage: number;
  completionPercentage: number;
}

export interface TestRunDto {
  id: string;
  projectId: string;
  runNumber: number;
  key?: string; // e.g. "CORE-TR-1"
  testPlanId: string | null;
  milestoneId: string | null;
  environmentId: string | null;
  assignedToId: string | null;
  createdById: string | null;
  name: string;
  description: string | null;
  status: TestRunStatus;
  isAutomated: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  testPlan?: {
    id: string;
    name: string;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
  environment?: {
    id: string;
    name: string;
  } | null;
  assignedTo?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  summary?: ExecutionSummaryDto;
  cases?: TestRunCaseDto[];
  _count?: {
    cases: number;
  };
}

export interface CreateTestRunInput {
  name: string;
  description?: string | null;
  testPlanId?: string | null;
  milestoneId?: string | null;
  environmentId?: string | null;
  assignedToId?: string | null;
  testCaseIds?: string[];
  testSuiteIds?: string[];
  isAutomated?: boolean;
}

export interface UpdateTestRunInput {
  name?: string;
  description?: string | null;
  milestoneId?: string | null;
  environmentId?: string | null;
  assignedToId?: string | null;
}

export interface TransitionRunStatusInput {
  status: TestRunStatus;
}

export interface AssignRunCasesInput {
  testRunCaseIds: string[];
  assignedToId?: string | null;
}

export interface AttachmentDto {
  id: string;
  projectId?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  storageKey?: string | null;
  uploadedById?: string | null;
  testResultId?: string | null;
  defectId?: string | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface TestExecutionStepDto {
  id: string;
  testResultId: string;
  stepNumber: number;
  status: ExecutionStatus | any;
  actualResult: string | null;
  comment: string | null;
  durationMs: number | null;
}

export interface TestResultDto {
  id: string;
  testRunCaseId: string;
  executedById: string | null;
  attemptNumber: number;
  status: ExecutionStatus | any;
  actualResult: string | null;
  comment: string | null;
  failureReason: string | null;
  durationMs: number | null;
  executedAt: string;
  executedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  stepResults: TestExecutionStepDto[];
  attachments: AttachmentDto[];
}

export interface TestRunCaseDto {
  id: string;
  testRunId: string;
  testCaseVersionId: string;
  assignedToId: string | null;
  status: ExecutionStatus | any;
  orderIndex: number;
  updatedAt: string;
  testRun?: {
    id: string;
    name: string;
    key?: string;
  };
  assignedTo?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  testCaseVersion: TestCaseVersionDto & {
    testCase?: {
      id: string;
      caseNumber: number;
      key?: string;
      title: string;
      suiteId?: string | null;
      suite?: { id: string; name: string } | null;
    };
  };
  results?: TestResultDto[];
  latestResult?: TestResultDto | null;
}

export interface StepExecutionInput {
  stepNumber: number;
  status: ExecutionStatus | any;
  actualResult?: string | null;
  comment?: string | null;
  durationMs?: number | null;
}

export interface SubmitExecutionInput {
  status?: ExecutionStatus | any; // optional: if not provided, backend calculates based on steps!
  actualResult?: string | null;
  comment?: string | null;
  failureReason?: string | null;
  durationMs?: number | null;
  stepResults?: StepExecutionInput[];
  attachmentIds?: string[];
}

export interface RetestExecutionInput extends SubmitExecutionInput {
  retestNotes?: string | null;
}

export interface ExecutionAnalyticsDto {
  totalCases: number;
  notRun: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passPercentage: number;
  completionPercentage: number;
  bySuite: Array<{
    suiteId: string;
    suiteName: string;
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
  }>;
  byEnvironment: Array<{
    environmentId: string;
    environmentName: string;
    total: number;
    passed: number;
    failed: number;
    notRun: number;
  }>;
  byTester: Array<{
    testerId: string;
    testerName: string;
    assignedCount: number;
    executedCount: number;
    passedCount: number;
    failedCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    testRunId: string;
    testRunName: string;
    testCaseTitle: string;
    status: ExecutionStatus;
    attemptNumber: number;
    executedAt: string;
    testerName: string;
    durationMs: number | null;
  }>;
}

// ----------------------------------------------------
// DEFECT MANAGEMENT DTOS (Milestone 06)
// ----------------------------------------------------

export interface DefectTestLinkDto {
  id: string;
  defectId: string;
  testCaseId: string | null;
  testResultId: string | null;
  testRunId: string | null;
  testCase?: {
    id: string;
    caseNumber: number;
    key?: string;
    title: string;
  } | null;
  testResult?: {
    id: string;
    attemptNumber: number;
    status: ExecutionStatus | any;
    executedAt: string;
  } | null;
  testRun?: {
    id: string;
    runNumber: number;
    key?: string;
    name: string;
  } | null;
}

export interface DefectCommentDto {
  id: string;
  defectId: string;
  userId: string;
  parentId: string | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  replies?: DefectCommentDto[];
}

export interface DefectHistoryDto {
  id: string;
  defectId: string;
  userId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  changedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface DefectDto {
  id: string;
  projectId: string;
  defectNumber: number;
  key?: string; // e.g. "CORE-BUG-1"
  title: string;
  description: string;
  stepsToRepro: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  browser: string | null;
  os: string | null;
  appVersion: string | null;
  device: string | null;
  component: string | null;
  severity: DefectSeverity | any;
  priority: DefectPriority | any;
  status: DefectStatus | any;
  type: DefectType | any;
  environmentId: string | null;
  milestoneId: string | null;
  reporterId: string;
  assigneeId: string | null;
  qaOwnerId: string | null;
  dueDate: string | null;
  resolution: string | null;
  rootCause: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  duplicateOfId: string | null;
  createdAt: string;
  updatedAt: string;
  environment?: {
    id: string;
    name: string;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
  reporter?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  qaOwner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  duplicateOf?: {
    id: string;
    defectNumber: number;
    key?: string;
    title: string;
    status: DefectStatus | any;
  } | null;
  duplicates?: Array<{
    id: string;
    defectNumber: number;
    key?: string;
    title: string;
    status: DefectStatus | any;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  testLinks?: DefectTestLinkDto[];
  comments?: DefectCommentDto[];
  history?: DefectHistoryDto[];
  attachments?: AttachmentDto[];
  _count?: {
    comments: number;
    attachments: number;
    testLinks: number;
    duplicates: number;
  };
}

export interface DuplicateCandidateDto {
  defect: DefectDto;
  confidence: number;
  matchReasons: string[];
}

export interface DefectAnalyticsDto {
  totalDefects: number;
  openDefects: number;
  resolvedDefects: number;
  closedDefects: number;
  criticalHighDefects: number;
  avgTimeToResolutionHours: number;
  reopenedRate: number;
  byStatus: Array<{ status: DefectStatus | string; count: number }>;
  bySeverity: Array<{ severity: DefectSeverity | string; count: number }>;
  byPriority: Array<{ priority: DefectPriority | string; count: number }>;
  byDeveloper: Array<{ userId: string; name: string; email: string; count: number }>;
  byComponent: Array<{ component: string; count: number }>;
  byMilestone: Array<{ milestoneId: string; name: string; count: number }>;
  aging: {
    lessThan7Days: number;
    between7And30Days: number;
    moreThan30Days: number;
  };
  recentActivity: Array<{
    id: string;
    defectId: string;
    defectKey: string;
    defectTitle: string;
    field: string;
    newValue: string | null;
    changedBy: string;
    changedAt: string;
  }>;
}

export interface CreateDefectInput {
  title: string;
  description: string;
  stepsToRepro?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  severity?: DefectSeverity | any;
  priority?: DefectPriority | any;
  type?: DefectType | any;
  status?: DefectStatus | any;
  environmentId?: string | null;
  milestoneId?: string | null;
  assigneeId?: string | null;
  qaOwnerId?: string | null;
  dueDate?: string | null;
  browser?: string | null;
  os?: string | null;
  appVersion?: string | null;
  device?: string | null;
  component?: string | null;
  tagNames?: string[];
  testResultId?: string | null;
  testCaseId?: string | null;
  testRunId?: string | null;
  attachmentIds?: string[];
}

export interface UpdateDefectInput {
  title?: string;
  description?: string;
  stepsToRepro?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  severity?: DefectSeverity | any;
  priority?: DefectPriority | any;
  type?: DefectType | any;
  environmentId?: string | null;
  milestoneId?: string | null;
  assigneeId?: string | null;
  qaOwnerId?: string | null;
  dueDate?: string | null;
  browser?: string | null;
  os?: string | null;
  appVersion?: string | null;
  device?: string | null;
  component?: string | null;
  rootCause?: string | null;
  resolution?: string | null;
  tagNames?: string[];
}

export interface TransitionDefectStatusInput {
  status: DefectStatus | any;
  resolution?: string | null;
  reason?: string | null;
  duplicateOfId?: string | null;
}

export interface AssignDefectInput {
  assigneeId?: string | null;
  qaOwnerId?: string | null;
}

export interface CreateDefectCommentInput {
  content: string;
  parentId?: string | null;
  isInternal?: boolean;
}

export interface LinkDefectTestInput {
  testCaseId?: string | null;
  testResultId?: string | null;
  testRunId?: string | null;
}



// ----------------------------------------------------
// MILESTONE 07: AI INTELLIGENCE ENGINE DTOS
// ----------------------------------------------------

export enum AITaskType {
  TEST_GENERATION = 'TEST_GENERATION',
  FAILURE_ANALYSIS = 'FAILURE_ANALYSIS',
  DUPLICATE_DETECTION = 'DUPLICATE_DETECTION',
  RISK_ANALYSIS = 'RISK_ANALYSIS',
  QA_REPORT_SUMMARY = 'QA_REPORT_SUMMARY',
}

export enum AIGenerationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AIReviewStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
}

export enum AIFeedbackRating {
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
  INACCURATE = 'INACCURATE',
  INCOMPLETE = 'INCOMPLETE',
}

export interface AIProviderConfigDto {
  id: string;
  organizationId: string;
  provider: AIProviderType;
  modelName: string;
  apiEndpoint: string | null;
  isActive: boolean;
  hasKey: boolean;
  maskedKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAIProviderConfigInput {
  provider: AIProviderType;
  apiKey?: string;
  modelName?: string;
  apiEndpoint?: string | null;
  isActive?: boolean;
}

export interface AIPromptTemplateDto {
  id: string;
  name: string;
  description: string | null;
  taskType: AITaskType;
  systemPrompt: string;
  userPromptTemplate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIGeneratedTestCaseProposal {
  title: string;
  description: string;
  preconditions?: string | null;
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
    testData?: string | null;
  }>;
  priority: TestPriority | string;
  type: TestType | string;
  scenarioType: 'POSITIVE' | 'NEGATIVE' | 'BOUNDARY' | 'EDGE' | 'SECURITY' | 'ACCESSIBILITY';
  requirementReference?: string | null;
}

export interface AIGenerationItemDto {
  id: string;
  generationId: string;
  itemType: string;
  title: string;
  content: AIGeneratedTestCaseProposal | Record<string, any>;
  reviewStatus: AIReviewStatus;
  isApproved: boolean;
  isRejected: boolean;
  reviewedById: string | null;
  reviewedAt: string | null;
  persistedTestCaseId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  persistedTestCase?: {
    id: string;
    caseNumber: number;
    key?: string;
    title: string;
  } | null;
}

export interface AIAnalysisResultDto {
  id: string;
  generationId: string | null;
  targetType: string;
  targetId: string;
  summary: string;
  rootCause: string | null;
  hypotheses: Array<{ cause: string; confidence: number; explanation: string }> | null;
  observedFacts: string[] | null;
  confidence: number | null;
  recommendations: string[];
  suggestedSeverity: DefectSeverity | null;
  suggestedPriority: DefectPriority | null;
  createdAt: string;
}

export interface AIFeedbackDto {
  id: string;
  generationId: string;
  userId: string;
  rating: number;
  ratingCategory?: AIFeedbackRating | null;
  comments: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AIEvaluationDto {
  id: string;
  generationId: string;
  schemaValid: boolean;
  requirementCoverage: number | null;
  hallucinationFlag: boolean;
  acceptanceRate: number | null;
  createdAt: string;
}

export interface AIGenerationDto {
  id: string;
  projectId: string;
  userId: string;
  organizationId: string;
  taskType: AITaskType;
  provider: AIProviderType;
  modelName: string;
  promptTemplateId: string | null;
  promptVersion: number | null;
  promptInput: string;
  rawOutput: string | null;
  structuredOutput: Record<string, any> | null;
  status: AIGenerationStatus;
  errorMessage: string | null;
  tokenPrompt: number;
  tokenCompletion: number;
  tokenCount: number;
  estimatedCost: number;
  latencyMs: number;
  createdAt: string;
  updatedAt: string;
  items?: AIGenerationItemDto[];
  analysisResults?: AIAnalysisResultDto[];
  feedback?: AIFeedbackDto[];
  evaluations?: AIEvaluationDto[];
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AIUsageLogDto {
  id: string;
  organizationId: string;
  projectId: string | null;
  userId: string | null;
  feature: string;
  provider: AIProviderType;
  modelName: string;
  tokensUsed: number;
  tokensPrompt: number;
  tokensCompletion: number;
  estimatedCost: number;
  durationMs: number;
  success: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface GenerateTestCasesInput {
  requirementText: string;
  suiteId?: string | null;
  targetCount?: number;
  includeEdgeCases?: boolean;
  includeSecurity?: boolean;
}

export interface AnalyzeFailureInput {
  testResultId: string;
  additionalLogs?: string | null;
}

export interface AnalyzeDuplicateDefectInput {
  title: string;
  description: string;
  component?: string | null;
  environmentId?: string | null;
}

export interface AnalyzeRiskInput {
  milestoneId?: string | null;
  environmentId?: string | null;
}

export interface GenerateQAReportInput {
  milestoneId?: string | null;
  testPlanId?: string | null;
  timeframeDays?: number;
}

export interface ReviewAIGenerationItemInput {
  reviewStatus: AIReviewStatus;
  modifiedContent?: AIGeneratedTestCaseProposal;
  suiteId?: string | null;
  rejectionReason?: string | null;
}

export interface BatchReviewAIGenerationItemsInput {
  generationId: string;
  itemIds: string[];
  action: 'ACCEPT' | 'REJECT';
  targetSuiteId?: string | null;
}

export interface SubmitAIFeedbackInput {
  rating: number;
  ratingCategory?: AIFeedbackRating | null;
  comments?: string | null;
}

export interface AIRiskAnalysisDto {
  overallRiskScore: number;
  riskCategory: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  contributingFactors: Array<{ factor: string; impact: string; weight: number }>;
  recommendedTestFocus: Array<{
    area: string;
    suggestedAction: string;
    testCasesCount: number;
    priority: string;
  }>;
  vulnerableComponents: Array<{
    name: string;
    failureRate: number;
    openDefects: number;
    riskScore: number;
  }>;
  dataSources: {
    totalTestCasesAnalyzed: number;
    failedExecutionsAnalyzed: number;
    openDefectsAnalyzed: number;
    codeIntegrationAvailable: boolean;
  };
}

export interface AIQAReportDto {
  headline: string;
  executiveSummary: string;
  releaseReadiness: {
    status: 'READY' | 'CONDITIONAL' | 'BLOCKED';
    score: number;
    recommendation: string;
  };
  metricsSummary: {
    totalTestCases: number;
    totalExecutions: number;
    passRatePercent: number;
    completionRatePercent: number;
    openDefects: number;
    criticalDefects: number;
    reopenRatePercent: number;
  };
  keyFindings: string[];
  blockerIssues: Array<{ key: string; title: string; severity: string }>;
  testingGaps: string[];
  suggestedActions: string[];
  generatedAt: string;
}

export interface AIFailureAnalysisDto {
  summary: string;
  observedFacts: string[];
  hypotheses: Array<{
    title: string;
    probability: 'HIGH' | 'MEDIUM' | 'LOW';
    confidence: number;
    explanation: string;
  }>;
  suggestedDebuggingSteps: string[];
  affectedComponents: string[];
  suggestedSeverity: DefectSeverity;
  suggestedPriority: DefectPriority;
  relatedDefectCandidates?: Array<{ key: string; title: string; similarity: number }>;
}

export interface AIDuplicateAnalysisDto {
  candidateDefectId: string;
  candidateKey: string;
  candidateTitle: string;
  similarityScore: number;
  confidenceLevel: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  matchReasons: string[];
  errorSignatureMatch: boolean;
  componentMatch: boolean;
  suggestedAction: 'MARK_DUPLICATE' | 'LINK_RELATED' | 'KEEP_SEPARATE';
}

// ----------------------------------------------------
// MILESTONE 08: AUTOMATION & CI/CD INTEGRATION TYPES
// ----------------------------------------------------

export type AutomationFramework = 'PLAYWRIGHT' | 'NEWMAN' | 'CYPRESS' | 'GENERIC';

export type AutomationSessionStatus = 'INITIALIZED' | 'INGESTING' | 'COMPLETED' | 'FAILED' | 'ABORTED';

export type AutomationTestResultStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT' | 'BLOCKED';

export interface AutomationApiTokenDto {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateAutomationTokenResponseDto {
  token: AutomationApiTokenDto;
  rawToken: string; // Only displayed once on creation
}

export interface AutomationTestMappingDto {
  id: string;
  projectId: string;
  testCaseId: string;
  externalId: string;
  externalTitle: string;
  framework: AutomationFramework;
  confidence: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  testCase?: {
    id: string;
    caseNumber: number;
    title: string;
    key?: string;
  };
}

export interface AutomationUnmappedTestDto {
  id: string;
  sessionId: string;
  projectId: string;
  externalId: string;
  externalTitle: string;
  suiteName: string | null;
  framework: AutomationFramework;
  lastSeenAt: string;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  resolvedTestCaseId: string | null;
  createdAt: string;
}

export interface AutomationSessionDto {
  id: string;
  projectId: string;
  organizationId: string;
  testRunId: string | null;
  idempotencyKey: string | null;
  framework: AutomationFramework;
  status: AutomationSessionStatus;
  environmentId: string | null;
  milestoneId: string | null;
  ciProvider: string | null;
  ciBuildId: string | null;
  ciBuildUrl: string | null;
  gitBranch: string | null;
  gitCommitSha: string | null;
  gitCommitMessage: string | null;
  gitAuthor: string | null;
  pullRequestNumber: number | null;
  os: string | null;
  browser: string | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  durationMs: number;
  metadata?: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  testRun?: {
    id: string;
    runNumber: number;
    name: string;
    status: TestRunStatus;
  } | null;
}

export interface AutomationWebhookEventDto {
  id: string;
  projectId: string;
  eventId: string;
  eventType: string;
  status: string;
  errorMessage: string | null;
  receivedAt: string;
}

export interface IngestTestResultItemDto {
  externalId: string;
  externalTitle: string;
  suiteHierarchy?: string[];
  status: AutomationTestResultStatus;
  durationMs: number;
  errorMessage?: string | null;
  stackTrace?: string | null;
  attemptNumber?: number;
  isFinalAttempt?: boolean;
  retryCount?: number;
  browser?: string | null;
  os?: string | null;
  testCaseId?: string | null;
  defectId?: string | null;
  attachments?: Array<{
    fileName: string;
    contentType: string;
    dataBase64?: string;
    fileUrl?: string;
    type?: string;
  }>;
  steps?: Array<{
    stepNumber: number;
    title: string;
    status: AutomationTestResultStatus;
    durationMs?: number;
    errorMessage?: string | null;
  }>;
}

export interface CreateAutomationTokenInput {
  name: string;
  scopes?: string[];
  expiresAt?: string | null;
}

export interface CreateAutomationSessionInput {
  framework?: AutomationFramework;
  environmentId?: string | null;
  milestoneId?: string | null;
  testRunName?: string;
  idempotencyKey?: string | null;
  ciProvider?: string | null;
  ciBuildId?: string | null;
  ciBuildUrl?: string | null;
  gitBranch?: string | null;
  gitCommitSha?: string | null;
  gitCommitMessage?: string | null;
  gitAuthor?: string | null;
  pullRequestNumber?: number | null;
  os?: string | null;
  browser?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IngestAutomationResultsInput {
  sessionId: string;
  results: IngestTestResultItemDto[];
}

export interface FinalizeAutomationSessionInput {
  sessionId: string;
  status?: 'COMPLETED' | 'FAILED' | 'ABORTED';
  summary?: {
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    skippedTests?: number;
    durationMs?: number;
  };
}

export interface CreateAutomationMappingInput {
  testCaseId: string;
  externalId: string;
  externalTitle: string;
  framework?: AutomationFramework;
}

export interface UpdateAutomationMappingInput {
  testCaseId?: string;
  externalTitle?: string;
  isVerified?: boolean;
}

export interface ResolveUnmappedTestInput {
  testCaseId?: string | null;
  createTestCase?: boolean;
  status: 'RESOLVED' | 'IGNORED';
}
