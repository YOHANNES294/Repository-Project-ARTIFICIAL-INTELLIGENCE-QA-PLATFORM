# Playwright Integration Example for AI QA Platform

This sample project demonstrates how to run Playwright end-to-end tests in your CI/CD pipeline and automatically upload structured execution results, retry attempts, step breakdowns, and traces directly to the **Artificial Intelligence QA Platform**.

---

## 1. Prerequisites & Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Install Playwright browser binaries:
   ```bash
   npx playwright install --with-deps chromium
   ```

---

## 2. Configuration

Set the following environment variables (e.g. in your `.env` or CI secret settings):

| Variable | Description | Example |
|---|---|---|
| `AIQA_API_URL` | Base API endpoint for the platform | `https://api.yourdomain.com/api/v1` |
| `AIQA_PROJECT_ID` | Platform project UUID | `08fd860e-4ff6-42d4-bb36-f64f43c3f25c` |
| `AIQA_API_TOKEN` | Scoped Automation API Token | `aiqa_auto_abc123_...` |
| `AIQA_ENVIRONMENT_ID` | Optional target Environment UUID | `Staging` |
| `AIQA_RUN_NAME` | Optional descriptive run title | `Nightly Smoke Tests` |

The reporter reads these variables directly and sends results to:
```
POST /api/v1/projects/:projectId/automation/sessions
POST /api/v1/projects/:projectId/automation/sessions/:sessionId/results
POST /api/v1/projects/:projectId/automation/sessions/:sessionId/finalize
```

---

## 3. Test Case Mapping in Test Code

You can link external Playwright tests to platform test cases in two ways:

### Method A: Annotation in Test Title
Include `@AIQA-<CaseNumber>` or `@TC-<CaseNumber>` in the test title:
```ts
test('User can sign in with valid credentials @AIQA-101', async ({ page }) => {
  // Automatically mapped to project TestCase #101 (e.g. CORE-101)
});
```

### Method B: Test Info Annotation
Add explicit test annotations:
```ts
test('Verify payment authorization', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testCaseId', description: '103' });
});
```

---

## 4. Running the Tests

Execute Playwright tests:
```bash
npx playwright test
```

The reporter will:
1. Initialize an ingestion session on the AI QA Platform.
2. Stream test results, step statuses, retries, and errors.
3. Automatically update execution statistics and link test cases.
4. If any test fails, make failure analysis available in the platform workbench.
