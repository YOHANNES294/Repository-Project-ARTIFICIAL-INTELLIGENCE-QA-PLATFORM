# AI QA Platform — Complete Master Documentation & Architecture Blueprint

An enterprise-grade, multi-tenant Quality Assurance & Test Management SaaS platform engineered to replace fragmented legacy tools (TestRail, Zephyr, Jira Xray) with unified modern test authoring, step-by-step live execution, AI automation, defect lifecycles, and real-time release quality analytics.

---

## 1. Project Idea & Core Problem Solved

### The Problem in Modern Engineering
Engineering organizations face severe fragmentation across quality assurance workflows:
* **Tool Sprawl**: Test cases reside in disorganized Google Sheets or Excel files; manual test runs are logged in TestRail; bug reports are thrown into Jira; and automated Playwright/Cypress results are locked inside CI logs.
* **Slow Manual Authoring**: QA engineers spend hours writing repetitive, boilerplate test steps for every new user story.
* **Ambiguous Defect Reports**: Developers receive defect tickets with vague descriptions, lacking the exact step-by-step reproduction sequence, browser environment, or test run context.
* **Blind Releases**: Leadership lacks a real-time, consolidated dashboard showing pass rates, flakiness, defect density, and whether a release candidate actually meets the quality bar.

### The Solution: The AI QA Platform
A unified SaaS platform that connects every phase of software testing:
1. **Repository**: Hierarchical test suites with version-controlled test cases.
2. **Execution**: Real-time workbenches with step-by-step Pass/Fail verification and stopwatch timers.
3. **Defects**: Complete defect lifecycle with direct two-way links back to the exact test step and run attempt.
4. **AI Intelligence**: AI-powered test case generation from requirements, automatic failure root-cause analysis, and semantic duplicate bug detection.
5. **Analytics & CI/CD**: Playwright/Newman test ingestion, scoped API tokens, webhook dispatchers, and automated release quality gates.

---

## 2. End-to-End System Workflow

The workflow across QA Leads, QA Testers, and Developers proceeds through 6 structured phases:

1. **Phase 1: Project & Team Setup**:
   - Create organization and invite members with roles (Owner, QA Lead, QA Tester, Developer).
   - Create a project (e.g., `Micky Mobile`, Key: `MI`).
   - Define target environments (Dev, QA, Staging, Production).

2. **Phase 2: Test Authoring**:
   - Organize hierarchical test suites (e.g., *Authentication*, *User Profile*, *Checkout*).
   - Write test cases with preconditions and ordered steps (Action, Test Data, Expected Result).
   - Or use the AI Intelligence Engine to generate test cases from user stories.
   - Test cases are versioned (`MI-1 v1`).

3. **Phase 3: Test Planning & Runs**:
   - Define a Milestone (e.g. *Sprint 1 Release*) and create a structured Test Plan.
   - Create a Test Run (e.g. `MI-TR-1 - Sprint 1 Smoke Run`) and select the cases to verify.

4. **Phase 4: Live Execution**:
   - Open the Execution Workbench and click **Start Test Run**.
   - Execute each test case step-by-step, recording actual observed results and toggling Pass/Fail.

5. **Phase 5: Defect Triaging & Retesting**:
   - If any step fails, click **Log Defect** to generate a pre-filled bug report (`MI-BUG-1`) with linked step evidence.
   - Developer reviews the reproduction steps, applies a code fix, and marks the bug `READY_FOR_RETEST`.
   - QA retests the test case, records Attempt #2, and closes the defect (`VERIFIED` -> `CLOSED`).

6. **Phase 6: Quality Sign-Off & Release**:
   - All tests pass (100% Pass Rate).
   - Review the Executive Analytics dashboard and quality gates.
   - Mark the Milestone as completed and release with full confidence.

---

## 3. Platform Architecture & Tech Stack

* **Frontend Web App**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, TanStack React Query.
* **Backend API Gateway**: Express.js, TypeScript, Prisma ORM, Argon2id encryption, Zod validation.
* **Database Layer**: PostgreSQL 16 relational database with strict multi-tenant row-level scoping.
* **Background Worker**: BullMQ with Redis for background AI tasks, report exports, and webhooks.
* **Shared Monorepo Packages**: `@ai-qa/shared-types`, `@ai-qa/validation`, `@ai-qa/api-client`, `@ai-qa/ui`.

---

## 4. User Roles & RBAC Matrix

* **Super Administrator**: Platform-wide management across all organizations and system health.
* **Organization Owner**: Manages organization settings, billing plans, and team invites.
* **QA Lead**: Creates projects, test suites, test plans, quality gates, and milestone releases.
* **QA Tester**: Authors test cases, executes test runs, logs defect tickets, and conducts retests.
* **Developer**: Inspects assigned defects, reproduces bugs, and updates statuses to `FIXED`.
* **Viewer**: Read-only stakeholder access to executive dashboards and coverage reports.

---

## 5. Master PDF Location

The formal multi-page PDF document has been compiled and saved to:
`docs/AI_QA_PLATFORM_MASTER_DOCUMENTATION.pdf`
