# MASTER ENGINEERING PROMPT
# ARTIFICIAL INTELLIGENCE QA PLATFORM
## Complete End-to-End Production Development

---

# 1. YOUR ROLE

Act as a Principal Software Architect, Senior Full-Stack Engineer, AI Engineer, Database Architect, DevOps Engineer, Security Engineer and QA Automation Engineer.

You are responsible for designing, implementing, testing, securing, documenting and preparing a complete production-oriented Artificial Intelligence Quality Assurance Management Platform.

You must work as an experienced engineering team, not as a code-generation assistant producing disconnected examples.

Your responsibility is to deliver a genuinely functional software product.

You must inspect the repository, understand the existing environment, make engineering decisions, implement the application, run it, test it, identify failures, fix them and verify the final result.

Do not stop after creating the architecture, folder structure, database schema or dashboard.

Do not deliver a frontend-only prototype.

Do not use fake data to simulate completed functionality.

Do not claim that something works unless it has been implemented and verified.

# 2. PRODUCT IDENTITY

Product name: Artificial Intelligence QA Platform

Working brand: AI QA Platform

Product category: AI-powered Software Quality Assurance and Test Management SaaS.

Product vision:

Build a comprehensive quality engineering platform that helps software organizations manage the complete software testing lifecycle.

The platform must support:

- Manual software testing.
- Automated software testing.
- Test case management.
- Test suite management.
- Test plans.
- Test execution.
- Test results.
- Milestone management.
- Defect and bug tracking.
- AI-assisted test generation.
- AI-powered test failure analysis.
- Intelligent quality analytics.
- API testing integrations.
- Browser automation integrations.
- Release readiness management.
- Team collaboration.
- Enterprise reporting.
- Multi-organization SaaS management.

The platform should provide capabilities comparable to Testmo, TestRail and Qase while differentiating itself through AI-assisted quality engineering.

# 3. NON-NEGOTIABLE ENGINEERING RULES

These rules apply throughout the entire development lifecycle.

1. Build real features connected to real backend APIs and PostgreSQL.
2. Never create fake buttons, fake navigation or nonfunctional forms.
3. Never present hardcoded statistics as live database information.
4. Never use localStorage as the primary database.
5. Never expose private API keys or database credentials in frontend code.
6. Never bypass backend authorization.
7. Never allow one organization to access another organization's data.
8. Never silently discard database errors.
9. Never mark a test as passed without a recorded execution result.
10. Never mark a release as approved automatically based only on AI recommendations.
11. Never create AI-generated test cases without schema validation.
12. Never claim integrations work without performing real integration tests.
13. Never disable tests merely to obtain a successful build.
14. Never delete existing project files without inspecting their purpose.
15. Never introduce unnecessary architectural complexity.
16. Never use placeholder implementations for production-critical workflows.
17. Never report deployment success without verifying the deployed application.
18. Every important operation must have appropriate error handling.
19. Every organization-owned resource must enforce tenant isolation.
20. All unfinished work must be explicitly documented.

Use real data throughout the application.

Demo seed data may exist for local development, but it must be clearly identified as seed data and never confused with live customer data.

# 4. REQUIRED TECHNOLOGY STACK

Use the following technology stack.

## Frontend

- Next.js 16 with App Router.
- React.
- TypeScript with strict mode.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- TanStack Query.
- React Hook Form.
- Zod.
- Recharts.
- Accessible and responsive UI components.

## Backend

- Node.js.
- Express.js.
- TypeScript.
- REST API.
- Zod request validation.
- Centralized error handling.
- Structured logging.
- OpenAPI documentation.

## Database

- PostgreSQL.
- Prisma ORM.
- UUID primary keys.
- Foreign key constraints.
- Database migrations.
- Proper indexing.
- Transaction management.
- PostgreSQL Row-Level Security where appropriate.

## Infrastructure

- Docker.
- Docker Compose.
- Redis.
- BullMQ.
- S3-compatible object storage.
- GitHub Actions.
- Environment-based configuration.

## Testing

- Vitest.
- Supertest.
- React Testing Library.
- Playwright.
- Postman/Newman.
- k6 for performance testing.

## AI

Implement a provider-independent AI integration architecture.

Support configurable AI providers through secure backend adapters.

AI capabilities must include:

- Requirement analysis.
- Test case generation.
- Test scenario generation.
- Failure analysis.
- Root cause suggestions.
- Duplicate defect detection.
- Risk analysis.
- Test coverage recommendations.
- QA report summarization.

AI must not be a mandatory dependency for ordinary test management operations.

The application must remain functional when an AI provider is unavailable.

# 5. APPLICATION ARCHITECTURE

Build a modular monolith with a separate background worker application.

Use a monorepo managed by pnpm workspaces.

Repository structure:

AI-QA-PLATFORM/

apps/
  web/
  api/
  worker/

packages/
  ui/
  shared-types/
  validation/
  api-client/
  config/

database/
  prisma/
  migrations/
  seeds/

integrations/
  playwright/
  postman/
  github/
  webhooks/

infrastructure/
  docker/
  deployment/
  monitoring/
  ci-cd/

docs/
  architecture/
  api/
  database/
  security/
  user-guides/
  milestones/
  deployment/

tests/
  integration/
  e2e/
  security/
  performance/
  ai-evaluation/

scripts/
README.md
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
.env.example
docker-compose.yml
pnpm-workspace.yaml
package.json
must_criteria.md

Keep application logic separated into domain modules.

Each backend module must have appropriate routes, controllers, services, repositories, validators, types and tests.

Avoid giant files and duplicated business logic.

# 6. AUTHENTICATION AND MULTI-TENANT SAAS

Implement complete authentication.

Required features:

- Registration.
- Login.
- Logout.
- Refresh sessions.
- Forgot password.
- Password reset.
- Email verification.
- Session management.
- Account security.
- Organization creation.
- Organization switching.
- Member invitations.
- Role-based access control.
- Permission management.

Use secure password hashing.

Use secure, HTTP-only cookies for browser authentication where appropriate.

Protect against CSRF, XSS, session fixation and brute-force attacks.

Implement organization-level data isolation.

Required organization roles:

- Owner.
- Administrator.
- QA Manager.
- QA Engineer.
- Automation Engineer.
- Developer.
- Viewer.

Support custom roles and permissions.

Every tenant-owned operation must derive its organization context from an authenticated and authorized session.

Never trust organization IDs supplied by the browser without authorization checks.

Use database-level tenant protection as an additional security layer.

# 7. ORGANIZATION MANAGEMENT

Implement:

- Organization profiles.
- Organization settings.
- Member management.
- Invitations.
- Organization roles.
- Permissions.
- Organization activity.
- Subscription association.
- Organization usage tracking.

Organizations must be isolated from each other.

# 8. PROJECT MANAGEMENT

Implement complete project management.

Features:

- Create projects.
- Update projects.
- Archive projects.
- Delete projects according to retention rules.
- Assign project members.
- Configure project environments.
- Configure project settings.
- Manage project access.
- Project activity history.
- Project statistics.

Each project must have a unique project key within its organization.

# 9. MILESTONE MANAGEMENT

Implement professional QA milestone management.

Fields:

- Milestone name.
- Description.
- Project.
- Start date.
- Due date.
- Status.
- Assigned manager.
- Release version.
- Associated test plans.
- Associated test runs.
- Associated defects.

Milestone statuses:

- Planned.
- Active.
- Completed.
- Delayed.
- Cancelled.

Provide progress tracking.

Calculate milestone progress from actual linked testing records.

Support release readiness criteria and quality gates.

# 10. TEST CASE MANAGEMENT

This is a core platform module.

Implement:

- Create test cases.
- Edit test cases.
- Duplicate test cases.
- Archive test cases.
- Version history.
- Test steps.
- Preconditions.
- Expected results.
- Priority.
- Test type.
- Tags.
- Attachments.
- Assignment.
- Search.
- Filtering.
- Sorting.
- Bulk operations.
- Import and export.

Test types:

- Functional.
- Regression.
- Smoke.
- Sanity.
- Integration.
- System.
- Acceptance.
- Performance.
- Security.
- Usability.
- Accessibility.
- Exploratory.

Test case priorities:

- Critical.
- High.
- Medium.
- Low.

Maintain immutable test case versions after execution references them.

A test execution must identify the exact test case version being executed.

# 11. TEST SUITE MANAGEMENT

Implement hierarchical test suites.

Features:

- Create folders.
- Create nested folders.
- Organize test cases.
- Move test cases.
- Reuse test cases.
- Search.
- Filter.
- Bulk assignment.
- Suite statistics.

Prevent invalid circular folder relationships.

# 12. TEST PLAN MANAGEMENT

Implement test plans containing:

- Project.
- Milestone.
- Description.
- Scope.
- Test suites.
- Selected test cases.
- Environment.
- Responsible QA team.
- Start and end dates.
- Execution strategy.
- Entry criteria.
- Exit criteria.

Allow test cases to be selected and organized into test plans.

Track changes to test plans.

# 13. TEST EXECUTION ENGINE

Implement a complete manual test execution system.

Features:

- Create test runs.
- Assign testers.
- Start execution.
- Execute individual test cases.
- Record step-level results.
- Record actual results.
- Add comments.
- Attach screenshots.
- Attach logs.
- Record execution duration.
- Track execution history.
- Re-run failed tests.
- Track blocked tests.
- Cancel runs.
- Complete runs.

Execution statuses:

- Not Run.
- Passed.
- Failed.
- Blocked.
- Skipped.
- Retest.

Maintain traceability between:

Project → Milestone → Test Plan → Test Case Version → Test Run → Execution Result → Defect.

Support concurrent execution safely.

Use database transactions for operations requiring atomicity.

# 14. DEFECT AND BUG MANAGEMENT

Implement a complete defect management module.

Fields:

- Defect ID.
- Title.
- Description.
- Project.
- Environment.
- Severity.
- Priority.
- Status.
- Reporter.
- Assignee.
- Steps to reproduce.
- Expected behavior.
- Actual behavior.
- Browser/device details.
- Attachments.
- Related test case.
- Related execution.
- Comments.
- Activity history.

Defect lifecycle:

Open → Triaged → Assigned → In Progress → Fixed → Ready for Retest → Verified → Closed.

Also support Reopened and Rejected.

Severity:

- Critical.
- Major.
- Moderate.
- Minor.
- Trivial.

Implement:

- Defect search.
- Filters.
- Assignment.
- Comments.
- History.
- Duplicate detection.
- Linked executions.
- Bulk operations.
- Defect analytics.

Do not automatically close defects through AI.

# 15. ARTIFICIAL INTELLIGENCE ENGINE

Build a separate AI domain module.

Architecture:

AI Gateway
  → Provider Adapters
  → Prompt Management
  → Context Retrieval
  → Structured Output Validation
  → AI Evaluation
  → Human Review

Implement provider adapters behind a common interface.

Do not hardcode a single AI provider throughout the business logic.

## AI Test Case Generator

Input:

- User story.
- Requirements.
- Technical specifications.
- Acceptance criteria.
- Existing test cases.

Output:

- Test title.
- Description.
- Preconditions.
- Steps.
- Expected results.
- Priority.
- Test category.
- Requirement references.

Generate:

- Positive scenarios.
- Negative scenarios.
- Boundary scenarios.
- Edge cases.
- Validation scenarios.
- Security scenarios where applicable.

Allow users to preview, edit, approve, reject and save generated test cases.

Prevent duplicate test generation where possible.

## AI Test Failure Analyzer

Accept:

- Test execution results.
- Error messages.
- Stack traces.
- Logs.
- Screenshots.
- Environment information.

Produce:

- Failure summary.
- Possible root cause.
- Relevant error evidence.
- Suggested investigation steps.
- Confidence estimate.
- Recommended next actions.

Clearly distinguish confirmed facts from AI hypotheses.

## AI Defect Assistant

Implement:

- Duplicate defect similarity detection.
- Suggested severity.
- Suggested priority.
- Defect summary generation.
- Reproduction-step improvement.
- Related defect recommendations.

All AI suggestions require user confirmation.

## AI Risk Analysis

Analyze:

- Historical failures.
- Defect frequency.
- Requirement changes.
- Test coverage.
- Unresolved critical defects.
- Regression failures.

Generate explainable risk assessments.

Do not represent predictions as guaranteed outcomes.

## AI QA Reporting

Generate summaries of:

- Test execution.
- Failed tests.
- Defect trends.
- Milestone health.
- Coverage gaps.
- Release risks.

## AI GOVERNANCE

Implement:

- AI usage tracking.
- Token and cost tracking.
- Provider health checks.
- Rate limiting.
- Prompt versioning.
- Output validation.
- AI evaluation datasets.
- Human feedback.
- Audit history.
- Organization-level usage limits.

Protect against prompt injection and sensitive information leakage.

Never send confidential project data to an external AI provider without respecting organization configuration and applicable permissions.

# 16. TEST AUTOMATION INTEGRATION

Implement a real automation integration system.

## Playwright

Provide:

- Project configuration.
- Secure CI integration.
- Execution ingestion.
- Test result mapping.
- Screenshot ingestion.
- Video and trace attachments.
- Error and stack trace ingestion.
- Run history.

Create a supported Playwright reporter package.

Allow a CI job to submit results through authenticated APIs.

Never execute arbitrary customer code directly inside the main API server.

Use isolated workers or external CI runners.

## API testing

Support:

- Postman collection import.
- Newman execution result ingestion.
- API response validation results.
- Request failure summaries.
- Environment association.

## CI/CD

Support GitHub Actions first.

Provide documented integration workflows.

Map commits, branches and pull requests to test runs.

Use signed webhook verification.

# 17. REPORTING AND ANALYTICS

Build real database-backed analytics.

Dashboard metrics:

- Total projects.
- Active milestones.
- Total test cases.
- Total test runs.
- Passed tests.
- Failed tests.
- Blocked tests.
- Open defects.
- Critical defects.
- Test coverage.
- Execution success rate.
- Release readiness.

Implement:

- Project reports.
- Milestone reports.
- Test execution reports.
- Defect reports.
- Tester performance reports.
- Automation reports.
- AI usage reports.
- Organization usage reports.

Provide date filtering and project filtering.

Support CSV and PDF exports.

Use actual database queries.

Never use hardcoded analytics values.

Document how each metric is calculated.

# 18. NOTIFICATION SYSTEM

Implement:

- In-app notifications.
- Email notifications.
- Test assignment alerts.
- Defect assignment alerts.
- Defect status updates.
- Milestone reminders.
- Failed automation alerts.
- Release readiness alerts.
- AI generation completion alerts.

Support user notification preferences.

Use background workers for email and other non-blocking operations.

Prevent duplicate notification delivery where possible.

# 19. BILLING AND SAAS ADMINISTRATION

Prepare the platform for commercial SaaS usage.

Implement:

- Free plan.
- Starter plan.
- Professional plan.
- Enterprise plan.

Each plan must support configurable limits:

- Organizations.
- Projects.
- Members.
- Test cases.
- Test runs.
- Automation executions.
- AI requests.
- Storage.
- API usage.

Implement:

- Subscription records.
- Billing status.
- Usage tracking.
- Plan limits.
- Subscription changes.
- Billing history.
- Super-admin dashboard.

Do not claim payment integration is complete unless a real payment provider has been integrated and tested.

Keep payment-provider integration isolated.

# 20. ADMINISTRATION

Create a separate platform administration area.

Super-admin functionality:

- Organization management.
- User management.
- Subscription management.
- System statistics.
- AI provider status.
- API usage.
- Background job status.
- Integration health.
- Audit logs.
- Security events.
- Platform settings.

Protect the super-admin area with separate permissions and strict server-side authorization.

# 21. FRONTEND EXPERIENCE

Build a premium enterprise SaaS interface.

Design direction:

- Modern professional dashboard.
- Consistent spacing.
- Professional typography.
- Accessible components.
- Responsive layouts.
- Light and dark themes.
- Clear navigation.
- Fast interactions.
- Professional data tables.
- Useful empty states.
- Loading skeletons.
- Meaningful error messages.
- Confirmation dialogs for destructive actions.

Main navigation:

1. Dashboard.
2. Organizations.
3. Projects.
4. Milestones.
5. Test Cases.
6. Test Suites.
7. Test Plans.
8. Test Runs.
9. Defects.
10. AI Assistant.
11. Automation.
12. Reports.
13. Notifications.
14. Settings.

Implement real navigation and route protection.

Every visible action must have a real function.

Use reusable UI components and feature-based frontend architecture.

# 22. DATABASE DESIGN

Use PostgreSQL with Prisma.

Create normalized models for:

- User.
- Organization.
- OrganizationMember.
- Role.
- Permission.
- RolePermission.
- Invitation.
- Subscription.
- BillingPlan.
- Project.
- ProjectMember.
- Environment.
- Milestone.
- TestSuite.
- TestCase.
- TestCaseVersion.
- TestStep.
- TestPlan.
- TestPlanCase.
- TestRun.
- TestRunCase.
- TestResult.
- TestExecutionStep.
- Defect.
- DefectAssignment.
- DefectComment.
- DefectHistory.
- DefectTestLink.
- Attachment.
- Notification.
- NotificationPreference.
- AuditLog.
- AIProviderConfig.
- AIGeneration.
- AIGenerationItem.
- AIAnalysisResult.
- AIUsageLog.
- AIFeedback.
- AIEmbedding.
- Integration.
- Webhook.
- APIKey.
- ReportDefinition.
- ReportSnapshot.

Apply:

- UUID primary keys.
- Explicit foreign keys.
- Unique constraints.
- Composite indexes.
- Timestamps.
- Referential integrity.
- Tenant isolation.
- Appropriate deletion policies.
- Database migrations.

Use pgvector only where semantic similarity and retrieval provide real value.

Do not overuse JSON columns for data that should be relational.

Create complete Prisma migrations and seed scripts.

# 23. API ENGINEERING

Use:

/api/v1

Implement consistent API conventions.

Requirements:

- Request validation.
- Response validation where appropriate.
- Authentication middleware.
- Authorization middleware.
- Tenant context.
- Pagination.
- Filtering.
- Sorting.
- Rate limiting.
- Request tracing.
- Centralized error handling.
- OpenAPI documentation.

Use proper HTTP status codes.

Never expose stack traces or internal secrets to clients.

# 24. SECURITY REQUIREMENTS

Follow OWASP security principles.

Implement:

- Secure authentication.
- Secure session handling.
- CSRF protection.
- XSS prevention.
- SQL injection protection.
- SSRF protection.
- Input validation.
- File upload validation.
- Malware scanning integration where appropriate.
- Rate limiting.
- Brute-force protection.
- Secure headers.
- CORS restrictions.
- Secrets management.
- Audit logging.
- Tenant isolation.
- Authorization tests.
- Data retention policies.
- Secure backups.

Encrypt sensitive integration credentials.

Never log passwords, session tokens, API secrets or confidential credentials.

# 25. OBSERVABILITY AND RELIABILITY

Implement:

- Structured logs.
- Request IDs.
- Error tracking.
- Health endpoints.
- Readiness endpoints.
- Background worker monitoring.
- Queue failure handling.
- Retry policies.
- Dead-letter handling.
- Database monitoring.
- Backup procedures.
- Restore procedures.

Implement graceful shutdown.

Use idempotency for important externally triggered operations.

# 26. DEVELOPMENT MILESTONES

Execute the following milestones in order.

MILESTONE 01 — Foundation and Architecture

- Inspect environment.
- Create monorepo.
- Configure pnpm.
- Configure TypeScript.
- Configure Next.js.
- Configure Express.
- Configure PostgreSQL.
- Configure Prisma.
- Configure Redis.
- Configure Docker.
- Configure logging.
- Configure health checks.
- Establish CI pipeline.

MILESTONE 02 — Authentication and SaaS Foundation

- Registration.
- Login.
- Logout.
- Refresh.
- Password recovery.
- Email verification.
- Organizations.
- Memberships.
- Roles.
- Permissions.
- Tenant isolation.

MILESTONE 03 — Project Management

- Projects.
- Environments.
- Project members.
- Project settings.
- Project activity.

MILESTONE 04 — Milestone and Test Management

- Milestones.
- Test suites.
- Test cases.
- Test steps.
- Tags.
- Versions.
- Search.
- Filtering.
- Import and export.

MILESTONE 05 — Test Planning and Execution

- Test plans.
- Test run creation.
- Test assignments.
- Execution.
- Step results.
- Attachments.
- Execution history.
- Re-testing.

MILESTONE 06 — Defect Management

- Defect creation.
- Defect assignment.
- Status lifecycle.
- Comments.
- History.
- Test traceability.
- Duplicate detection.

MILESTONE 07 — AI Intelligence

- AI gateway.
- Provider adapters.
- AI test generation.
- Failure analysis.
- Defect assistance.
- Risk assessment.
- AI reporting.
- Usage tracking.
- AI evaluation.

MILESTONE 08 — Automation Integration

- Playwright reporter.
- Automation result ingestion.
- Screenshots.
- Logs.
- GitHub Actions.
- Postman/Newman.

MILESTONE 09 — Analytics and Reporting

- Dashboard.
- Execution statistics.
- Defect analytics.
- Coverage.
- Milestone progress.
- Release readiness.
- PDF and CSV exports.

MILESTONE 10 — Notifications and Integrations

- In-app notifications.
- Email.
- Webhooks.
- GitHub integration.
- User preferences.
- Audit logs.

MILESTONE 11 — Billing and Administration

- Billing plans.
- Subscription management.
- Usage tracking.
- Plan limits.
- Super-admin dashboard.

MILESTONE 12 — Production Readiness

- Full regression testing.
- Security testing.
- Performance testing.
- Accessibility testing.
- Database backup.
- Restore validation.
- Monitoring.
- Deployment.
- Production smoke testing.
- Documentation.

# 27. TESTING REQUIREMENTS

Every module must have automated tests.

Minimum testing categories:

1. Unit tests.
2. Backend integration tests.
3. Frontend component tests.
4. End-to-end tests.
5. Authentication tests.
6. Authorization tests.
7. Tenant isolation tests.
8. Database migration tests.
9. AI output validation tests.
10. Integration tests.
11. Performance tests.
12. Security tests.

Critical test scenarios:

- Unauthorized users cannot access protected resources.
- Organization A cannot access organization B's records.
- Users cannot exceed their permissions.
- Failed executions cannot be counted as passed.
- Test case versions remain traceable.
- Defects retain complete histories.
- Duplicate webhook events do not duplicate operations.
- Invalid AI responses are rejected.
- AI provider failure does not disable ordinary QA operations.
- Subscription limits are enforced server-side.
- Data is recoverable from tested backups.

# 28. DOCUMENTATION REQUIREMENTS

Maintain:

README.md
ARCHITECTURE.md
DATABASE.md
API.md
SECURITY.md
DEPLOYMENT.md
CONTRIBUTING.md
CHANGELOG.md
must_criteria.md

Create:

- Installation guide.
- Local development guide.
- Environment configuration guide.
- Database migration guide.
- Seed data guide.
- API documentation.
- AI configuration guide.
- Automation integration guide.
- Deployment guide.
- Backup and recovery guide.
- User documentation.
- Administrator documentation.

Documentation must describe actual implemented functionality.

# 29. EXECUTION RULES FOR THE CODING AGENT

Start by inspecting the current working directory, repository, installed dependencies, Node.js version, package manager, Git status and available environment configuration.

If the repository already contains work, preserve it unless there is a clear and documented reason to change it.

Do not assume an empty repository.

Create an implementation plan and maintain it in:

docs/milestones/IMPLEMENTATION_PLAN.md

Maintain the execution checklist in:

must_criteria.md

For each milestone:

1. Inspect requirements.
2. Identify dependencies.
3. Implement database changes.
4. Implement backend functionality.
5. Implement frontend functionality.
6. Connect frontend and backend.
7. Run relevant tests.
8. Fix failures.
9. Run type checking.
10. Run production build.
11. Update documentation.
12. Update the milestone checklist.
13. Record verified deliverables.

Do not skip ahead when critical dependencies are incomplete.

Do not stop at a planning document.

Do not repeatedly ask for approval for ordinary implementation decisions.

Use reasonable engineering defaults.

If credentials or external services are missing, implement the integration interface, document the exact configuration required and continue with other independent work. Clearly distinguish implemented code from unverified external functionality.

Do not fabricate test results, deployment URLs, external service responses or integration success.

When a command fails, investigate the underlying cause and fix it instead of hiding the error.

When a milestone is too large for one execution session, complete a coherent working increment, persist the implementation status and continue from the checklist in subsequent sessions.

# 30. DEFINITION OF DONE

The entire project is complete only when:

- All required modules are implemented.
- Frontend and backend are integrated.
- Database migrations work from a clean database.
- Authentication works.
- Tenant isolation is tested.
- Role-based permissions work.
- Test case management works.
- Test execution works.
- Defect management works.
- AI test generation works with a configured provider.
- AI analysis works with a configured provider.
- Automation results can be ingested.
- Analytics are database-backed.
- Notifications work.
- SaaS limits are enforced.
- API documentation exists.
- Automated tests pass.
- Production builds succeed.
- Security checks are completed.
- Backup and restore procedures are validated.
- Deployment is verified.
- No critical known defects remain unresolved.

Any remaining limitations must be documented honestly.

# 31. FINAL DELIVERY REPORT

At the end, provide a factual engineering delivery report containing:

1. Project architecture.
2. Implemented modules.
3. Database schema and migrations.
4. API endpoints.
5. AI integrations.
6. Automation integrations.
7. Security controls.
8. Testing performed.
9. Test results.
10. Build results.
11. Deployment status.
12. Remaining limitations.
13. Required environment variables.
14. Setup commands.
15. Production deployment instructions.

Never claim the project is 100% complete unless all acceptance criteria have been verified.

# FINAL DIRECTIVE

You are not being asked to create a sample dashboard or a demonstration application.

You are being tasked with engineering a real Artificial Intelligence Quality Assurance SaaS platform.

Prioritize correctness, security, maintainability, reliability, real functionality and verifiable results over speed and superficial visual appearance.

Start with repository inspection and Milestone 01.

Then implement the complete system through Milestone 12.

Do not stop after generating code.

Build it, run it, test it, fix it, document it and verify it.
