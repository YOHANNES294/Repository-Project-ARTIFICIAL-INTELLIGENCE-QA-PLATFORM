'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
  Terminal,
  Layers,
  GitBranch,
  Key,
} from 'lucide-react';

export default function AutomationSetupPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<'playwright' | 'newman' | 'github'>('playwright');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const playwrightConfigCode = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['list'],
    [
      '@ai-qa/playwright-reporter',
      {
        apiUrl: process.env.AIQA_API_URL || 'https://api.yourdomain.com/api/v1',
        projectId: process.env.AIQA_PROJECT_ID || '${projectId}',
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
});`;

  const playwrightTestCode = `import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  // Option A: Link via title annotation
  test('User can sign in @AIQA-101', async ({ page }) => {
    await page.goto('/login');
    // ... test steps ...
  });

  // Option B: Link via testInfo.annotations
  test('User password reset', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'testCaseId', description: '102' });
    await page.goto('/forgot-password');
  });
});`;

  const newmanCommandCode = `# 1. Run Postman Collection and output JSON summary report:
newman run collection.json -e environment.json -r json --reporter-json-export report.json

# 2. Upload report directly to the AI QA Platform:
curl -X POST "https://api.yourdomain.com/api/v1/projects/${projectId}/automation/ingest/newman" \\
  -H "Authorization: Bearer <YOUR_AIQA_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d @report.json`;

  const githubActionsYaml = `name: E2E Regression Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run Playwright & Upload Results
        run: npx playwright test
        env:
          AIQA_API_URL: "https://api.yourdomain.com/api/v1"
          AIQA_PROJECT_ID: "${projectId}"
          AIQA_API_TOKEN: \${{ secrets.AIQA_API_TOKEN }}
          AIQA_RUN_NAME: "GitHub Actions CI Run #\${{ github.run_number }}"
          GITHUB_ACTIONS: "true"
          CI: "true"`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/automation`}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-emerald-600" />
              Automation Integration Setup Guides
            </h1>
            <p className="text-sm text-slate-500">
              Integrate external test runners with your CI/CD pipelines and the AI QA Platform
            </p>
          </div>
        </div>

        <Link
          href={`/projects/${projectId}/automation/tokens`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors"
        >
          <Key className="h-4 w-4" />
          Get API Token
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        <button
          onClick={() => setActiveTab('playwright')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'playwright'
              ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Terminal className="h-4 w-4" />
          Playwright Integration
        </button>
        <button
          onClick={() => setActiveTab('newman')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'newman'
              ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          Postman & Newman
        </button>
        <button
          onClick={() => setActiveTab('github')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'github'
              ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitBranch className="h-4 w-4" />
          GitHub Actions Workflow
        </button>
      </div>

      {/* Content */}
      {activeTab === 'playwright' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              1. Install the Playwright Reporter
            </h2>
            <p className="text-sm text-slate-500">
              Install the official AI QA reporter package in your test project:
            </p>
            <div className="relative bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm">
              <code>npm install --save-dev @ai-qa/playwright-reporter</code>
              <button
                onClick={() => copyToClipboard('npm install --save-dev @ai-qa/playwright-reporter', 1)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {copiedIndex === 1 ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              2. Configure <code className="text-cyan-600 font-mono">playwright.config.ts</code>
            </h2>
            <div className="relative bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <pre>{playwrightConfigCode}</pre>
              <button
                onClick={() => copyToClipboard(playwrightConfigCode, 2)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {copiedIndex === 2 ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              3. Annotate Test Cases in Specs
            </h2>
            <p className="text-sm text-slate-500">
              Tag your automated tests with their corresponding platform TestCase numbers:
            </p>
            <div className="relative bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <pre>{playwrightTestCode}</pre>
              <button
                onClick={() => copyToClipboard(playwrightTestCode, 3)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {copiedIndex === 3 ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'newman' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Postman / Newman Ingestion
          </h2>
          <p className="text-sm text-slate-500">
            Export your collection results as JSON with Newman and submit them with a single authenticated API call.
          </p>
          <div className="relative bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{newmanCommandCode}</pre>
            <button
              onClick={() => copyToClipboard(newmanCommandCode, 4)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              {copiedIndex === 4 ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'github' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            GitHub Actions CI Workflow Example
          </h2>
          <p className="text-sm text-slate-500">
            Add this workflow file to <code className="font-mono text-cyan-600">.github/workflows/e2e.yml</code> and add secret <code className="font-mono text-cyan-600">AIQA_API_TOKEN</code> in your repository settings:
          </p>
          <div className="relative bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{githubActionsYaml}</pre>
            <button
              onClick={() => copyToClipboard(githubActionsYaml, 5)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              {copiedIndex === 5 ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
