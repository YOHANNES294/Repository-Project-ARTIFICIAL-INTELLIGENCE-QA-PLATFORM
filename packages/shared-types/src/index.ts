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

