import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100).trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).trim(),
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID format'),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum([
    'OWNER',
    'ADMINISTRATOR',
    'QA_MANAGER',
    'QA_ENGINEER',
    'AUTOMATION_ENGINEER',
    'DEVELOPER',
    'VIEWER',
  ]).default('VIEWER'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([
    'OWNER',
    'ADMINISTRATOR',
    'QA_MANAGER',
    'QA_ENGINEER',
    'AUTOMATION_ENGINEER',
    'DEVELOPER',
    'VIEWER',
  ]),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100).trim(),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(10, 'Key must be at most 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Project key must consist of uppercase letters and digits only'),
  description: z.string().max(1000).optional(),
  objectives: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  settings: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.enum(['PROJECT_LEAD', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(['PROJECT_LEAD', 'MEMBER', 'VIEWER']),
});

export const createEnvironmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required').max(50).trim(),
  type: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION', 'CUSTOM']).default('CUSTOM'),
  url: z.string().url('Invalid URL format').max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  variables: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required').max(50).trim().optional(),
  type: z.enum(['DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION', 'CUSTOM']).optional(),
  url: z.string().url('Invalid URL format').max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  variables: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const createMilestoneSchema = z
  .object({
    name: z.string().min(2, 'Milestone name must be at least 2 characters').max(100).trim(),
    description: z.string().max(2000).optional().nullable(),
    objectives: z.string().max(2000).optional().nullable(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).default('PLANNED'),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    releaseVer: z.string().max(50).optional().nullable(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
    dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
    ownerId: z.string().uuid('Invalid owner ID format').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return new Date(data.dueDate).getTime() >= new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: 'Due date cannot be earlier than start date',
      path: ['dueDate'],
    }
  );

export const updateMilestoneSchema = z
  .object({
    name: z.string().min(2, 'Milestone name must be at least 2 characters').max(100).trim().optional(),
    description: z.string().max(2000).optional().nullable(),
    objectives: z.string().max(2000).optional().nullable(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    releaseVer: z.string().max(50).optional().nullable(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
    dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
    completedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
    ownerId: z.string().uuid('Invalid owner ID format').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return new Date(data.dueDate).getTime() >= new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: 'Due date cannot be earlier than start date',
      path: ['dueDate'],
    }
  );

export const createTestSuiteSchema = z.object({
  name: z.string().min(2, 'Suite name must be at least 2 characters').max(100).trim(),
  description: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  parentId: z.string().uuid('Invalid parent suite ID format').optional().nullable(),
  orderIndex: z.number().int().min(0).default(0),
});

export const updateTestSuiteSchema = z.object({
  name: z.string().min(2, 'Suite name must be at least 2 characters').max(100).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  parentId: z.string().uuid('Invalid parent suite ID format').optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50).trim(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid hex code (e.g. #3B82F6)')
    .default('#3B82F6'),
});

export const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50).trim().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color must be a valid hex code (e.g. #3B82F6)')
    .optional(),
});

export const testStepSchema = z.object({
  id: z.string().uuid().optional(),
  stepNumber: z.number().int().positive('Step number must be a positive integer'),
  action: z.string().min(1, 'Action description is required').max(2000),
  testData: z.string().max(2000).optional().nullable(),
  expectedResult: z.string().min(1, 'Expected result is required').max(2000),
});

export const createTestCaseSchema = z.object({
  title: z.string().min(3, 'Title is required').max(255).trim(),
  description: z.string().max(5000).optional().nullable(),
  preconditions: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  type: z
    .enum([
      'FUNCTIONAL',
      'REGRESSION',
      'SMOKE',
      'SANITY',
      'INTEGRATION',
      'SYSTEM',
      'ACCEPTANCE',
      'PERFORMANCE',
      'SECURITY',
      'USABILITY',
      'ACCESSIBILITY',
      'EXPLORATORY',
    ])
    .default('FUNCTIONAL'),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED']).default('ACTIVE'),
  estimatedTimeMin: z.number().int().min(0).max(1440).optional().nullable(),
  suiteId: z.string().uuid('Invalid suite ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  steps: z.array(testStepSchema).min(1, 'At least one test step is required'),
});

export const updateTestCaseSchema = z.object({
  title: z.string().min(3, 'Title is required').max(255).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  preconditions: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  type: z
    .enum([
      'FUNCTIONAL',
      'REGRESSION',
      'SMOKE',
      'SANITY',
      'INTEGRATION',
      'SYSTEM',
      'ACCEPTANCE',
      'PERFORMANCE',
      'SECURITY',
      'USABILITY',
      'ACCESSIBILITY',
      'EXPLORATORY',
    ])
    .optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED']).optional(),
  estimatedTimeMin: z.number().int().min(0).max(1440).optional().nullable(),
  suiteId: z.string().uuid('Invalid suite ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  steps: z.array(testStepSchema).min(1, 'At least one test step is required').optional(),
  changeSummary: z.string().max(500).optional().nullable(),
});

export const csvImportRowSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255).trim(),
  description: z.string().max(5000).optional().nullable(),
  preconditions: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  type: z
    .enum([
      'FUNCTIONAL',
      'REGRESSION',
      'SMOKE',
      'SANITY',
      'INTEGRATION',
      'SYSTEM',
      'ACCEPTANCE',
      'PERFORMANCE',
      'SECURITY',
      'USABILITY',
      'ACCESSIBILITY',
      'EXPLORATORY',
    ])
    .default('FUNCTIONAL'),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED']).default('ACTIVE'),
  estimatedTimeMin: z.number().int().min(0).max(1440).optional().nullable(),
  suiteName: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).default([]),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().positive(),
        action: z.string().min(1, 'Action description is required'),
        testData: z.string().max(2000).optional().nullable(),
        expectedResult: z.string().min(1, 'Expected result is required'),
      })
    )
    .min(1, 'At least one test step is required'),
});

export const csvBulkImportSchema = z.object({
  rows: z.array(csvImportRowSchema).min(1, 'At least one valid row is required for import'),
  defaultSuiteId: z.string().uuid().optional().nullable(),
  defaultMilestoneId: z.string().uuid().optional().nullable(),
});

// ----------------------------------------------------
// MILESTONE 05: TEST PLANNING & EXECUTION SCHEMAS
// ----------------------------------------------------

export const createTestPlanSchema = z
  .object({
    name: z.string().min(3, 'Test plan name must be at least 3 characters').max(200).trim(),
    description: z.string().max(5000).optional().nullable(),
    objectives: z.string().max(3000).optional().nullable(),
    scope: z.string().max(3000).optional().nullable(),
    strategy: z.string().max(3000).optional().nullable(),
    status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).default('DRAFT'),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
    environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
    managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
    entryCriteria: z.string().max(2000).optional().nullable(),
    exitCriteria: z.string().max(2000).optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const updateTestPlanSchema = z
  .object({
    name: z.string().min(3, 'Test plan name must be at least 3 characters').max(200).trim().optional(),
    description: z.string().max(5000).optional().nullable(),
    objectives: z.string().max(3000).optional().nullable(),
    scope: z.string().max(3000).optional().nullable(),
    strategy: z.string().max(3000).optional().nullable(),
    status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
    environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
    managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
    entryCriteria: z.string().max(2000).optional().nullable(),
    exitCriteria: z.string().max(2000).optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const selectPlanCasesSchema = z.object({
  testCaseIds: z.array(z.string().uuid('Invalid test case ID')).min(1, 'Select at least one test case'),
});

export const duplicateTestPlanSchema = z.object({
  name: z.string().min(3, 'Name is required').max(200).trim(),
  includeCases: z.boolean().default(true),
});

export const createTestRunSchema = z.object({
  name: z.string().min(3, 'Test run name must be at least 3 characters').max(200).trim(),
  description: z.string().max(5000).optional().nullable(),
  testPlanId: z.string().uuid('Invalid test plan ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
  assignedToId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  testCaseIds: z.array(z.string().uuid()).default([]),
  testSuiteIds: z.array(z.string().uuid()).default([]),
  isAutomated: z.boolean().default(false),
});

export const updateTestRunSchema = z.object({
  name: z.string().min(3, 'Test run name must be at least 3 characters').max(200).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
  assignedToId: z.string().uuid('Invalid assignee ID').optional().nullable(),
});

export const transitionRunStatusSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED']),
});

export const assignRunCasesSchema = z.object({
  testRunCaseIds: z.array(z.string().uuid('Invalid test run case ID')).min(1, 'At least one case required'),
  assignedToId: z.string().uuid('Invalid assignee ID').optional().nullable(),
});

export const stepExecutionSchema = z.object({
  stepNumber: z.number().int().positive(),
  status: z.enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST']),
  actualResult: z.string().max(3000).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  durationMs: z.number().int().min(0).optional().nullable(),
});

export const submitExecutionSchema = z.object({
  status: z.enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST']).optional(),
  actualResult: z.string().max(5000).optional().nullable(),
  comment: z.string().max(3000).optional().nullable(),
  failureReason: z.string().max(2000).optional().nullable(),
  durationMs: z.number().int().min(0).optional().nullable(),
  stepResults: z.array(stepExecutionSchema).optional(),
  attachmentIds: z.array(z.string().uuid('Invalid attachment ID')).optional(),
});

export const retestExecutionSchema = submitExecutionSchema.extend({
  retestNotes: z.string().max(2000).optional().nullable(),
});

// ----------------------------------------------------
// DEFECT MANAGEMENT SCHEMAS (Milestone 06)
// ----------------------------------------------------

export const defectSeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MAJOR',
  'MEDIUM',
  'MODERATE',
  'LOW',
  'MINOR',
  'TRIVIAL',
]);

export const defectPriorityEnum = z.enum([
  'URGENT',
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
]);

export const defectStatusEnum = z.enum([
  'NEW',
  'OPEN',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'FIXED',
  'READY_FOR_RETEST',
  'VERIFIED',
  'CLOSED',
  'REOPENED',
  'REJECTED',
  'DUPLICATE',
]);

export const defectTypeEnum = z.enum([
  'FUNCTIONAL',
  'UI',
  'API',
  'PERFORMANCE',
  'SECURITY',
  'ACCESSIBILITY',
  'DATA',
  'INTEGRATION',
  'OTHER',
]);

export const createDefectSchema = z.object({
  title: z.string().min(3, 'Defect title must be at least 3 characters').max(255).trim(),
  description: z.string().min(5, 'Defect description must be at least 5 characters').max(10000).trim(),
  stepsToRepro: z.string().max(10000).optional().nullable(),
  expectedResult: z.string().max(5000).optional().nullable(),
  actualResult: z.string().max(5000).optional().nullable(),
  severity: defectSeverityEnum.default('MEDIUM'),
  priority: defectPriorityEnum.default('MEDIUM'),
  type: defectTypeEnum.default('FUNCTIONAL'),
  status: defectStatusEnum.default('NEW'),
  environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  qaOwnerId: z.string().uuid('Invalid QA owner ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  browser: z.string().max(100).optional().nullable(),
  os: z.string().max(100).optional().nullable(),
  appVersion: z.string().max(100).optional().nullable(),
  device: z.string().max(100).optional().nullable(),
  component: z.string().max(100).optional().nullable(),
  tagNames: z.array(z.string().min(1).max(50)).default([]),
  testResultId: z.string().uuid('Invalid test result ID').optional().nullable(),
  testCaseId: z.string().uuid('Invalid test case ID').optional().nullable(),
  testRunId: z.string().uuid('Invalid test run ID').optional().nullable(),
  attachmentIds: z.array(z.string().uuid('Invalid attachment ID')).optional(),
});

export const updateDefectSchema = z.object({
  title: z.string().min(3, 'Defect title must be at least 3 characters').max(255).trim().optional(),
  description: z.string().min(5, 'Defect description must be at least 5 characters').max(10000).trim().optional(),
  stepsToRepro: z.string().max(10000).optional().nullable(),
  expectedResult: z.string().max(5000).optional().nullable(),
  actualResult: z.string().max(5000).optional().nullable(),
  severity: defectSeverityEnum.optional(),
  priority: defectPriorityEnum.optional(),
  type: defectTypeEnum.optional(),
  environmentId: z.string().uuid('Invalid environment ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  qaOwnerId: z.string().uuid('Invalid QA owner ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  browser: z.string().max(100).optional().nullable(),
  os: z.string().max(100).optional().nullable(),
  appVersion: z.string().max(100).optional().nullable(),
  device: z.string().max(100).optional().nullable(),
  component: z.string().max(100).optional().nullable(),
  rootCause: z.string().max(5000).optional().nullable(),
  resolution: z.string().max(5000).optional().nullable(),
  tagNames: z.array(z.string().min(1).max(50)).optional(),
});

export const transitionDefectStatusSchema = z.object({
  status: defectStatusEnum,
  resolution: z.string().max(5000).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  duplicateOfId: z.string().uuid('Invalid duplicate defect ID').optional().nullable(),
});

export const assignDefectSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  qaOwnerId: z.string().uuid('Invalid QA owner ID').optional().nullable(),
});

export const createDefectCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000).trim(),
  parentId: z.string().uuid('Invalid parent comment ID').optional().nullable(),
  isInternal: z.boolean().default(false),
});

export const linkDefectTestSchema = z.object({
  testCaseId: z.string().uuid('Invalid test case ID').optional().nullable(),
  testResultId: z.string().uuid('Invalid test result ID').optional().nullable(),
  testRunId: z.string().uuid('Invalid test run ID').optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateTestSuiteInput = z.infer<typeof createTestSuiteSchema>;
export type UpdateTestSuiteInput = z.infer<typeof updateTestSuiteSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TestStepInput = z.infer<typeof testStepSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type CsvImportRowInput = z.infer<typeof csvImportRowSchema>;
export type CsvBulkImportInput = z.infer<typeof csvBulkImportSchema>;


// ----------------------------------------------------
// MILESTONE 07: AI INTELLIGENCE SCHEMAS
// ----------------------------------------------------

export const aiProviderTypeEnum = z.enum([
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'MOCK',
  'CUSTOM',
]);

export const aiTaskTypeEnum = z.enum([
  'TEST_GENERATION',
  'FAILURE_ANALYSIS',
  'DUPLICATE_DETECTION',
  'RISK_ANALYSIS',
  'QA_REPORT_SUMMARY',
]);

export const aiReviewStatusEnum = z.enum([
  'PROPOSED',
  'ACCEPTED',
  'MODIFIED',
  'REJECTED',
]);

export const aiFeedbackRatingEnum = z.enum([
  'HELPFUL',
  'NOT_HELPFUL',
  'INACCURATE',
  'INCOMPLETE',
]);

export const updateAIProviderConfigSchema = z.object({
  provider: aiProviderTypeEnum,
  apiKey: z.string().min(1, 'API key cannot be empty').max(500).optional(),
  modelName: z.string().min(1).max(100).optional(),
  apiEndpoint: z.string().url().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const generateTestCasesSchema = z.object({
  requirementText: z
    .string()
    .min(10, 'Requirement text must be at least 10 characters')
    .max(50000, 'Requirement text exceeds maximum allowed size (50k characters)')
    .trim(),
  suiteId: z.string().uuid('Invalid suite ID').nullable().optional(),
  targetCount: z.number().int().min(1).max(30).default(5),
  includeEdgeCases: z.boolean().default(true),
  includeSecurity: z.boolean().default(true),
});

export const analyzeFailureSchema = z.object({
  testResultId: z.string().uuid('Invalid test result ID'),
  additionalLogs: z.string().max(50000).nullable().optional(),
});

export const analyzeDuplicateDefectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255).trim(),
  description: z.string().max(20000).trim().default(''),
  component: z.string().max(100).nullable().optional(),
  environmentId: z.string().uuid('Invalid environment ID').nullable().optional(),
});

export const analyzeRiskSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID').nullable().optional(),
  environmentId: z.string().uuid('Invalid environment ID').nullable().optional(),
});

export const generateQAReportSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID').nullable().optional(),
  testPlanId: z.string().uuid('Invalid test plan ID').nullable().optional(),
  timeframeDays: z.number().int().min(1).max(365).default(30),
});

export const reviewAIGenerationItemSchema = z.object({
  reviewStatus: aiReviewStatusEnum,
  modifiedContent: z.any().optional(),
  suiteId: z.string().uuid('Invalid suite ID').nullable().optional(),
  rejectionReason: z.string().max(1000).nullable().optional(),
});

export const batchReviewAIGenerationItemsSchema = z.object({
  generationId: z.string().uuid('Invalid generation ID'),
  itemIds: z.array(z.string().uuid('Invalid item ID')).min(1, 'Select at least one item'),
  action: z.enum(['ACCEPT', 'REJECT']),
  targetSuiteId: z.string().uuid('Invalid suite ID').nullable().optional(),
});

export const submitAIFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  ratingCategory: aiFeedbackRatingEnum.nullable().optional(),
  comments: z.string().max(2000).nullable().optional(),
});

export type UpdateAIProviderConfigInput = z.infer<typeof updateAIProviderConfigSchema>;
export type GenerateTestCasesInput = z.infer<typeof generateTestCasesSchema>;
export type AnalyzeFailureInput = z.infer<typeof analyzeFailureSchema>;
export type AnalyzeDuplicateDefectInput = z.infer<typeof analyzeDuplicateDefectSchema>;
export type AnalyzeRiskInput = z.infer<typeof analyzeRiskSchema>;
export type GenerateQAReportInput = z.infer<typeof generateQAReportSchema>;
export type ReviewAIGenerationItemInput = z.infer<typeof reviewAIGenerationItemSchema>;
export type BatchReviewAIGenerationItemsInput = z.infer<typeof batchReviewAIGenerationItemsSchema>;
export type SubmitAIFeedbackInput = z.infer<typeof submitAIFeedbackSchema>;

// ----------------------------------------------------
// MILESTONE 08: AUTOMATION & CI/CD SCHEMAS
// ----------------------------------------------------

export const automationFrameworkEnum = z.enum([
  'PLAYWRIGHT',
  'NEWMAN',
  'CYPRESS',
  'GENERIC',
]);

export const automationSessionStatusEnum = z.enum([
  'INITIALIZED',
  'INGESTING',
  'COMPLETED',
  'FAILED',
  'ABORTED',
]);

export const automationTestResultStatusEnum = z.enum([
  'PASSED',
  'FAILED',
  'SKIPPED',
  'TIMED_OUT',
  'BLOCKED',
]);

export const createAutomationTokenSchema = z.object({
  name: z.string().min(2, 'Token name must be at least 2 characters').max(100).trim(),
  scopes: z.array(z.string()).default(['automation:ingest']),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const createAutomationSessionSchema = z.object({
  framework: automationFrameworkEnum.default('PLAYWRIGHT'),
  environmentId: z.string().uuid('Invalid environment ID').nullable().optional(),
  milestoneId: z.string().uuid('Invalid milestone ID').nullable().optional(),
  testRunName: z.string().max(255).optional(),
  idempotencyKey: z.string().max(255).nullable().optional(),
  ciProvider: z.string().max(100).nullable().optional(),
  ciBuildId: z.string().max(255).nullable().optional(),
  ciBuildUrl: z.string().url().max(1000).nullable().optional(),
  gitBranch: z.string().max(255).nullable().optional(),
  gitCommitSha: z.string().max(100).nullable().optional(),
  gitCommitMessage: z.string().max(1000).nullable().optional(),
  gitAuthor: z.string().max(255).nullable().optional(),
  pullRequestNumber: z.number().int().positive().nullable().optional(),
  os: z.string().max(100).nullable().optional(),
  browser: z.string().max(100).nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

export const ingestTestResultStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().max(500),
  status: automationTestResultStatusEnum,
  durationMs: z.number().int().nonnegative().optional(),
  errorMessage: z.string().max(5000).nullable().optional(),
});

export const ingestTestResultAttachmentSchema = z.object({
  fileName: z.string().max(255),
  contentType: z.string().max(100),
  dataBase64: z.string().optional(),
  fileUrl: z.string().optional(),
  type: z.string().optional(),
});

export const ingestTestResultItemSchema = z.object({
  externalId: z.string().min(1, 'External test ID is required').max(500),
  externalTitle: z.string().min(1, 'External test title is required').max(1000),
  suiteHierarchy: z.array(z.string().max(255)).default([]),
  status: automationTestResultStatusEnum,
  durationMs: z.number().int().nonnegative().default(0),
  errorMessage: z.string().max(20000).nullable().optional(),
  stackTrace: z.string().max(50000).nullable().optional(),
  attemptNumber: z.number().int().positive().default(1),
  isFinalAttempt: z.boolean().default(true),
  retryCount: z.number().int().nonnegative().default(0),
  browser: z.string().max(100).nullable().optional(),
  os: z.string().max(100).nullable().optional(),
  testCaseId: z.string().max(100).nullable().optional(),
  defectId: z.string().max(100).nullable().optional(),
  attachments: z.array(ingestTestResultAttachmentSchema).default([]),
  steps: z.array(ingestTestResultStepSchema).default([]),
});

export const ingestAutomationResultsSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  results: z.array(ingestTestResultItemSchema).min(1, 'At least one test result must be provided').max(1000),
});

export const finalizeAutomationSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  status: z.enum(['COMPLETED', 'FAILED', 'ABORTED']).default('COMPLETED'),
  summary: z.object({
    totalTests: z.number().int().nonnegative().optional(),
    passedTests: z.number().int().nonnegative().optional(),
    failedTests: z.number().int().nonnegative().optional(),
    skippedTests: z.number().int().nonnegative().optional(),
    durationMs: z.number().int().nonnegative().optional(),
  }).optional(),
});

export const createAutomationMappingSchema = z.object({
  testCaseId: z.string().uuid('Invalid test case ID'),
  externalId: z.string().min(1, 'External ID is required').max(500),
  externalTitle: z.string().min(1, 'External title is required').max(1000),
  framework: automationFrameworkEnum.default('PLAYWRIGHT'),
});

export const updateAutomationMappingSchema = z.object({
  testCaseId: z.string().uuid('Invalid test case ID').optional(),
  externalTitle: z.string().max(1000).optional(),
  isVerified: z.boolean().optional(),
});

export const resolveUnmappedTestSchema = z.object({
  testCaseId: z.string().uuid('Invalid test case ID').nullable().optional(),
  createTestCase: z.boolean().default(false),
  status: z.enum(['RESOLVED', 'IGNORED']).default('RESOLVED'),
});

export type CreateAutomationTokenInput = z.infer<typeof createAutomationTokenSchema>;
export type CreateAutomationSessionInput = z.infer<typeof createAutomationSessionSchema>;
export type IngestAutomationResultsInput = z.infer<typeof ingestAutomationResultsSchema>;
export type FinalizeAutomationSessionInput = z.infer<typeof finalizeAutomationSessionSchema>;
export type CreateAutomationMappingInput = z.infer<typeof createAutomationMappingSchema>;
export type UpdateAutomationMappingInput = z.infer<typeof updateAutomationMappingSchema>;
export type ResolveUnmappedTestInput = z.infer<typeof resolveUnmappedTestSchema>;

// ----------------------------------------------------
// MILESTONE 09: ADVANCED ANALYTICS & REPORTING SCHEMAS
// ----------------------------------------------------

export const reportTypeEnum = z.enum([
  'EXECUTIVE',
  'TEST_EXECUTION',
  'DEFECT_ANALYSIS',
  'TEST_COVERAGE',
  'AUTOMATION_PERFORMANCE',
  'MILESTONE_RELEASE',
  'AI_INTELLIGENCE',
]);

export const exportFormatEnum = z.enum(['CSV', 'XLSX', 'PDF']);

export const reportFrequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);

export const analyticsFilterQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  environmentId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  component: z.string().optional(),
});

export const createReportDefinitionSchema = z.object({
  name: z.string().min(2, 'Report name must be at least 2 characters').max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  type: reportTypeEnum.default('EXECUTIVE'),
  metrics: z.array(z.string().min(1).max(100)).optional(),
  dimensions: z.array(z.string().min(1).max(100)).optional(),
  filters: z.record(z.any()).default({}),
  isTemplate: z.boolean().default(false),
});

export const updateReportDefinitionSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  metrics: z.array(z.string().min(1).max(100)).optional(),
  dimensions: z.array(z.string().min(1).max(100)).optional(),
  filters: z.record(z.any()).optional(),
});

export const createReportSnapshotSchema = z.object({
  reportDefId: z.string().uuid().optional().nullable(),
  name: z.string().max(200).optional(),
  type: reportTypeEnum.default('EXECUTIVE'),
  dateRangeStart: z.string().datetime().optional(),
  dateRangeEnd: z.string().datetime().optional(),
});

export const createReportScheduleSchema = z.object({
  reportDefId: z.string().uuid('Valid report definition ID is required'),
  name: z.string().min(2).max(200).trim(),
  frequency: reportFrequencyEnum.default('WEEKLY'),
  cronExpression: z.string().max(100).optional().nullable(),
  recipients: z.array(z.string().email('Invalid email recipient')).min(1, 'At least one recipient is required'),
  format: exportFormatEnum.default('PDF'),
});

export const createProjectQualityGateSchema = z.object({
  name: z.string().min(2, 'Quality gate name must be at least 2 characters').max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  minTestPassRate: z.number().min(0).max(100).default(90.0),
  maxCriticalDefects: z.number().int().min(0).default(0),
  maxHighDefects: z.number().int().min(0).default(2),
  minExecutionCoverage: z.number().min(0).max(100).default(80.0),
  requireAllSuitesCompleted: z.boolean().default(false),
  requireZeroBlockers: z.boolean().default(true),
  isDefault: z.boolean().default(true),
});

export const updateProjectQualityGateSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  minTestPassRate: z.number().min(0).max(100).optional(),
  maxCriticalDefects: z.number().int().min(0).optional(),
  maxHighDefects: z.number().int().min(0).optional(),
  minExecutionCoverage: z.number().min(0).max(100).optional(),
  requireAllSuitesCompleted: z.boolean().optional(),
  requireZeroBlockers: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const exportReportSchema = z.object({
  reportType: reportTypeEnum,
  format: exportFormatEnum,
  filters: z.record(z.any()).default({}),
  name: z.string().max(200).optional(),
});

export type AnalyticsFilterQueryInput = z.infer<typeof analyticsFilterQuerySchema>;
export type CreateReportDefinitionInputSchema = z.infer<typeof createReportDefinitionSchema>;
export type UpdateReportDefinitionInputSchema = z.infer<typeof updateReportDefinitionSchema>;
export type CreateReportSnapshotInputSchema = z.infer<typeof createReportSnapshotSchema>;
export type CreateReportScheduleInputSchema = z.infer<typeof createReportScheduleSchema>;
export type CreateProjectQualityGateInputSchema = z.infer<typeof createProjectQualityGateSchema>;
export type UpdateProjectQualityGateInputSchema = z.infer<typeof updateProjectQualityGateSchema>;
export type ExportReportInputSchema = z.infer<typeof exportReportSchema>;

// ====================================================
// MILESTONE 10 — NOTIFICATIONS & EXTERNAL INTEGRATIONS
// ====================================================

export const notificationCategoryEnum = z.enum([
  'ASSIGNMENT',
  'DEFECT',
  'EXECUTION',
  'AUTOMATION',
  'AI',
  'REPORTING',
  'SECURITY',
  'GENERAL',
]);

export const notificationPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const digestFrequencyEnum = z.enum(['NONE', 'DAILY', 'WEEKLY']);

export const integrationProviderEnum = z.enum([
  'SLACK',
  'TEAMS',
  'GITHUB',
  'GENERIC_WEBHOOK',
]);

export const integrationStatusEnum = z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR']);

export const updateNotificationPreferencesSchema = z.object({
  emailAlerts: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
  defectUpdates: z.boolean().optional(),
  testAssignment: z.boolean().optional(),
  executionAlerts: z.boolean().optional(),
  automationAlerts: z.boolean().optional(),
  aiAlerts: z.boolean().optional(),
  reportingAlerts: z.boolean().optional(),
  mentionAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  digestFrequency: digestFrequencyEnum.optional(),
  digestTimezone: z.string().max(100).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format (e.g. 22:00)').optional().nullable(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format (e.g. 08:00)').optional().nullable(),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.enum(['true', 'false', 'all']).optional().default('all'),
  category: notificationCategoryEnum.optional(),
  priority: notificationPriorityEnum.optional(),
  search: z.string().max(200).optional(),
});

export const createIntegrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  provider: integrationProviderEnum,
  events: z.array(z.string()).default([]),
  config: z.record(z.any()),
  isEnabled: z.boolean().default(true),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  events: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional(),
  status: integrationStatusEnum.optional(),
});

export const testIntegrationSchema = z.object({
  provider: integrationProviderEnum,
  config: z.record(z.any()),
});

export const createWebhookSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  url: z.string().url('Must be a valid HTTP or HTTPS URL').max(1000),
  secret: z.string().min(8, 'Secret must be at least 8 characters').max(256).optional(),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  url: z.string().url().max(1000).optional(),
  secret: z.string().min(8).max(256).optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateNotificationPreferencesSchema = z.infer<typeof updateNotificationPreferencesSchema>;
export type NotificationQuerySchema = z.infer<typeof notificationQuerySchema>;
export type CreateIntegrationSchema = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationSchema = z.infer<typeof updateIntegrationSchema>;
export type TestIntegrationSchema = z.infer<typeof testIntegrationSchema>;
export type CreateWebhookSchema = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookSchema = z.infer<typeof updateWebhookSchema>;

// ----------------------------------------------------
// MILESTONE 11 — BILLING & SAAS ADMINISTRATION
// ----------------------------------------------------

export const billingTierEnum = z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
export const subscriptionStatusEnum = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED',
  'INCOMPLETE',
]);
export const billingIntervalEnum = z.enum(['MONTHLY', 'YEARLY']);
export const paymentStatusEnum = z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'DISPUTED']);
export const invoiceStatusEnum = z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']);
export const usageMetricEnum = z.enum([
  'PROJECTS',
  'MEMBERS',
  'TEST_CASES',
  'TEST_RUNS_MONTHLY',
  'AUTOMATION_RUNS_MONTHLY',
  'AI_TOKENS_MONTHLY',
  'STORAGE_BYTES',
]);
export const paymentProviderTypeEnum = z.enum(['LOCAL_TEST', 'STRIPE', 'CHAPA']);

export const createBillingPlanSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters').max(100),
  tier: billingTierEnum,
  description: z.string().max(500).optional(),
  priceCentsMonth: z.number().int().min(0, 'Monthly price cannot be negative'),
  priceCentsYear: z.number().int().min(0, 'Yearly price cannot be negative'),
  currency: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  maxProjects: z.number().int().min(-1),
  maxMembers: z.number().int().min(-1),
  maxTestCases: z.number().int().min(-1),
  maxTestRunsPerMonth: z.number().int().min(-1),
  maxAutomationRunsPerMonth: z.number().int().min(-1),
  aiTokenAllowance: z.number().int().min(-1),
  storageBytes: z.number().int().min(-1).optional(),
  allowCustomReports: z.boolean().default(false),
  allowIntegrations: z.boolean().default(false),
  allowAdvancedAnalytics: z.boolean().default(false),
  allowSso: z.boolean().default(false),
  allowAuditExport: z.boolean().default(false),
});

export const updateBillingPlanSchema = createBillingPlanSchema.partial();

export const changeSubscriptionSchema = z.object({
  planTier: billingTierEnum,
  interval: billingIntervalEnum.default('MONTHLY'),
  paymentProvider: paymentProviderTypeEnum.default('LOCAL_TEST'),
});

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export const recordUsageSchema = z.object({
  organizationId: z.string().uuid(),
  metric: usageMetricEnum,
  quantity: z.number().int(),
  idempotencyKey: z.string().min(8).max(256),
  sourceType: z.string().min(2).max(100),
  sourceId: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

export const createUsageAdjustmentSchema = z.object({
  metric: usageMetricEnum,
  quantityDelta: z.number().int(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export const createCheckoutSessionSchema = z.object({
  planTier: billingTierEnum,
  interval: billingIntervalEnum.default('MONTHLY'),
  provider: paymentProviderTypeEnum.default('LOCAL_TEST'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const configurePaymentProviderSchema = z.object({
  provider: paymentProviderTypeEnum,
  isEnabled: z.boolean().default(true),
  isTestMode: z.boolean().default(true),
  publishableKey: z.string().max(255).optional(),
  secretKey: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
});

export const suspendOrganizationSchema = z.object({
  reason: z.string().min(3, 'Suspension reason is required').max(500),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(3, 'Suspension reason is required').max(500),
});

export type CreateBillingPlanSchema = z.infer<typeof createBillingPlanSchema>;
export type UpdateBillingPlanSchema = z.infer<typeof updateBillingPlanSchema>;
export type ChangeSubscriptionSchema = z.infer<typeof changeSubscriptionSchema>;
export type CancelSubscriptionSchema = z.infer<typeof cancelSubscriptionSchema>;
export type RecordUsageSchema = z.infer<typeof recordUsageSchema>;
export type CreateUsageAdjustmentSchema = z.infer<typeof createUsageAdjustmentSchema>;
export type CreateCheckoutSessionSchema = z.infer<typeof createCheckoutSessionSchema>;
export type ConfigurePaymentProviderSchema = z.infer<typeof configurePaymentProviderSchema>;
export type SuspendOrganizationSchema = z.infer<typeof suspendOrganizationSchema>;
export type SuspendUserSchema = z.infer<typeof suspendUserSchema>;


