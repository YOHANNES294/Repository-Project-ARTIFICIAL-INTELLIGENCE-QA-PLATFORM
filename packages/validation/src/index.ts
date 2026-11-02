import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(10, 'Key must be at most 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Project key must consist of uppercase letters and digits only'),
  description: z.string().max(1000).optional(),
});

export const createTestCaseSchema = z.object({
  title: z.string().min(3, 'Title is required').max(255),
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
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
