# Artificial Intelligence QA Platform

> Enterprise AI-Powered Software Quality Assurance and Test Management SaaS.

---

## 1. Overview
The **Artificial Intelligence QA Platform** provides an end-to-end quality engineering environment comparable to Testmo, TestRail, and Qase, augmented with intelligent AI-driven test case generation, failure root-cause analysis, and predictive risk management.

## 2. Architecture & Monorepo Structure
Managed via `pnpm` workspaces:

```
AI-QA-PLATFORM/
├── apps/
│   ├── web/           # Next.js 16 (App Router), React 19, Tailwind CSS, TanStack Query
│   ├── api/           # Express.js REST API (/api/v1), Zod, Winston logging, OpenAPI
│   └── worker/        # BullMQ background worker service backed by Redis
├── packages/
│   ├── shared-types/  # Domain models, enums (Roles, Statuses, Tiers), API envelopes
│   ├── validation/    # Shared Zod validation schemas
│   ├── api-client/    # Type-safe frontend client for backend endpoints
│   ├── ui/            # UI components and layout utilities
│   └── config/        # Base TypeScript and tooling configurations
├── database/
│   └── prisma/        # PostgreSQL schema, migrations, seed scripts
├── integrations/
│   ├── playwright/    # Playwright custom reporter package
│   └── postman/       # Postman & Newman ingestion adapters
├── infrastructure/
│   ├── docker/        # Containerization configurations
│   └── ci-cd/         # GitHub Actions workflows
└── docs/              # Architectural, Database, API, and Security guides
```

## 3. Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide icons, TanStack Query.
- **Backend**: Node.js v24+, Express.js, TypeScript, Winston, Zod.
- **Database**: PostgreSQL 16, Prisma ORM 6.
- **Queue/Cache**: Redis 7, BullMQ.
- **Testing**: Vitest, Supertest.
- **Containerization**: Docker, Docker Compose.

## 4. Quickstart

### Prerequisites
- Node.js >= 20 (v24.18.0 tested)
- pnpm >= 9.0.0
- Docker & Docker Compose (optional for local standalone containers)

### Installation
```bash
# Install workspace dependencies
pnpm install

# Generate Prisma Client
pnpm db:generate

# Build all packages and applications
pnpm build

# Run all tests
pnpm test

# Run TypeScript type check
pnpm typecheck
```

### Running Locally
```bash
# Start backend API (Port 4000)
pnpm dev:api

# Start Next.js frontend (Port 3000)
pnpm dev:web

# Start background worker
pnpm dev:worker
```

---

## 5. Test Automation & CI/CD Integration (Milestone 08)

### Playwright Integration
The platform provides a dedicated Playwright reporter package in `integrations/playwright`.

1. **Install reporter** in your Playwright project:
   ```bash
   pnpm add -D @ai-qa/playwright-reporter
   ```
2. **Configure in `playwright.config.ts`**:
   ```typescript
   export default defineConfig({
     reporter: [
       ['list'],
       [
         '@ai-qa/playwright-reporter',
         {
           apiUrl: process.env.AIQA_API_URL || 'http://localhost:4000',
           token: process.env.AIQA_AUTOMATION_TOKEN,
           projectId: process.env.AIQA_PROJECT_ID,
           environmentName: 'STAGING',
           testPlanId: process.env.AIQA_TEST_PLAN_ID, // optional
         },
       ],
     ],
   });
   ```
3. **Map tests** using test title annotations:
   ```typescript
   test('@AIQA-101 User should be able to log in successfully', async ({ page }) => {
     // Test code
   });
   ```

A complete reference implementation is available in `examples/playwright-demo`.

### Postman & Newman Integration
The platform provides a dedicated Postman adapter in `integrations/postman`.

1. Run Newman with the JSON summary reporter:
   ```bash
   npx newman run ./collection.json -r cli,json --reporter-json-export ./newman-report.json
   ```
2. Upload the report directly to the ingestion API:
   ```bash
   curl -X POST "http://localhost:4000/api/v1/projects/$PROJECT_ID/automation/ingest/newman" \
     -H "Authorization: Bearer $AIQA_AUTOMATION_TOKEN" \
     -H "Content-Type: application/json" \
     -d @newman-report.json
   ```

### GitHub Actions CI Workflow
Sample workflow configuration is available at `.github/workflows/automation-ci.yml`. Webhook notifications can be sent to `/api/v1/projects/:projectId/automation/webhooks/github` with HMAC-SHA256 signature verification.


---

## 6. Advanced Analytics & Reporting (Milestone 09)

The platform features an advanced analytics and reporting suite operating directly on live PostgreSQL data:
- **Executive QA Dashboard**: High-level pass/fail rates, execution coverage %, open defect impact, and release readiness health scores with historical trend comparisons (+/- deltas).
- **Execution Diagnostics & Flaky Test Detection**: Daily time-series trends, test suite breakdowns, tester workload leaderboards, persistent failure streaks, and explainable outcome-flip flakiness scoring.
- **Multi-Dimensional Coverage Matrix**: Evaluates existence, execution, requirement reference, and automated code coverage.
- **Defect Lifecycle & MTTR**: Mean Time to Repair in hours, reopen rates, traceability to test executions, and aging duration distribution buckets (<3d, 3-7d, 8-14d, 15-30d, >30d).
- **Release Governance & Quality Gates**: Configurable rule-by-rule gates (`minPassRate`, `maxCriticalDefects`, `maxHighDefects`, `minCoverage`, `zeroBlockers`) with automated release verdicts (`READY_FOR_RELEASE`, `WARNING_NEEDS_REVIEW`, `BLOCKED_DO_NOT_RELEASE`).
- **Custom Reports & Snapshots**: Build custom report templates, freeze immutable historical snapshots for compliance sign-offs, and configure automated recurring schedules (`DAILY`, `WEEKLY`, `MONTHLY`).
- **Multi-Format Export Engine**: Download reports in sanitized CSV, multi-worksheet Excel (XLSX), or executive scorecard PDF, fortified with OWASP Formula Injection Defense (CWE-1236).
