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
});

export const createTestCaseSchema = z.object({
  title: z.string().min(3, 'Title is required').max(255).trim(),
  description: z.string().max(5000).optional(),
  preconditions: z.string().max(2000).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  type: z.enum([
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
  ]).default('FUNCTIONAL'),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().positive(),
        action: z.string().min(1, 'Action description is required'),
        expectedResult: z.string().min(1, 'Expected result is required'),
      })
    )
    .min(1, 'At least one test step is required'),
  tags: z.array(z.string()).default([]),
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
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
