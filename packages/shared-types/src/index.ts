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
  MAJOR = 'MAJOR',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
  TRIVIAL = 'TRIVIAL',
}

// Defect Priority
export enum DefectPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Defect Lifecycle Status
export enum DefectStatus {
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

