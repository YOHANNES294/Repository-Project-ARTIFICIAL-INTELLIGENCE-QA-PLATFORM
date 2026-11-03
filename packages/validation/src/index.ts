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
