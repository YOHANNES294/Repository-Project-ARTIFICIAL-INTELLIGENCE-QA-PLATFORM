import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['list'],
    [
      '@ai-qa/playwright-reporter',
      {
        apiUrl: process.env.AIQA_API_URL || 'http://localhost:4000/api/v1',
        projectId: process.env.AIQA_PROJECT_ID,
        apiToken: process.env.AIQA_API_TOKEN,
        environmentId: process.env.AIQA_ENVIRONMENT_ID,
        testRunName: process.env.AIQA_RUN_NAME,
      },
    ],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
