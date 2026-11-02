import { describe, it, expect } from 'vitest';
import { registerSchema, createProjectSchema, createTestCaseSchema } from '../src/index.js';

describe('Validation Schemas', () => {
  it('validates correct user registration inputs', () => {
    const input = {
      email: 'test@example.com',
      password: 'StrongPassword123',
      firstName: 'Jane',
      lastName: 'Doe',
      organizationName: 'Acme Quality Corp',
    };
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('rejects weak passwords or invalid emails', () => {
    const invalidInput = {
      email: 'invalid-email',
      password: 'weak',
      firstName: 'Jane',
      lastName: 'Doe',
      organizationName: 'Acme',
    };
    const parsed = registerSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
  });

  it('validates project creation key format', () => {
    const valid = createProjectSchema.safeParse({
      name: 'Core Platform',
      key: 'CORE',
      description: 'Main project',
    });
    expect(valid.success).toBe(true);

    const invalidKey = createProjectSchema.safeParse({
      name: 'Core Platform',
      key: 'core-platform!',
    });
    expect(invalidKey.success).toBe(false);
  });

  it('enforces at least one test step in test cases', () => {
    const withoutSteps = createTestCaseSchema.safeParse({
      title: 'Verify User Login',
      steps: [],
    });
    expect(withoutSteps.success).toBe(false);

    const withSteps = createTestCaseSchema.safeParse({
      title: 'Verify User Login',
      steps: [
        {
          stepNumber: 1,
          action: 'Navigate to /login and submit credentials',
          expectedResult: 'Redirects to dashboard',
        },
      ],
    });
    expect(withSteps.success).toBe(true);
  });
});
