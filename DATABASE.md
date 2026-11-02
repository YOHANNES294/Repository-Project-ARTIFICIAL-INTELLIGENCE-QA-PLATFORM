# Database Architecture & Schema Specification

## 1. Engine & Configuration
- **Engine**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Primary Keys**: UUID v4
- **Referential Integrity**: Foreign key constraints with explicit cascade and set-null rules.

## 2. Core Entities & Relationships
1. **Multi-Tenancy & Access Control**:
   - `Organization`: Root tenant boundary.
   - `User`: Global user entity with credentials and profile.
   - `OrganizationMember`: Maps User to Organization with standard `OrganizationRole` and optional custom `Role`.
   - `Role` & `Permission` & `RolePermission`: Granular RBAC definitions.
   - `Subscription` & `BillingPlan`: SaaS tier and resource limit constraints.

2. **Project & Test Management**:
   - `Project`: Project domain with unique key per organization.
   - `Environment`: Environment targets (Dev, Staging, QA, Prod).
   - `Milestone`: Milestone lifecycle with release versioning and status.
   - `TestSuite`: Recursive hierarchical tree with parent/child relationship.
   - `TestCase` & `TestCaseVersion` & `TestStep`: Immutable test case versions.

3. **Execution Engine & Defects**:
   - `TestPlan` & `TestPlanCase`: Test planning and scoping.
   - `TestRun` & `TestRunCase`: Scheduled and automated test runs.
   - `TestResult` & `TestExecutionStep`: Granular step-level execution records.
   - `Defect`, `DefectAssignment`, `DefectComment`, `DefectHistory`: Full defect lifecycle.
   - `DefectTestLink`: Bi-directional traceability between defects and test results.

4. **AI & Audit Models**:
   - `AIGeneration`, `AIGenerationItem`: Prompt inputs and generated test cases.
   - `AIAnalysisResult`: Automated root-cause and defect duplicate analysis.
   - `AIUsageLog`: Token consumption, costing, and rate-limiting telemetry.
   - `AuditLog`: System and user audit trails.

## 3. Migrations & Workflow
- Schema defined in `database/prisma/schema.prisma`.
- Client generation: `pnpm db:generate`.
- Migrations: `pnpm --filter @ai-qa/api prisma:migrate`.
