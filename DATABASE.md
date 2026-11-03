# Database Architecture & Schema Specification

## 1. Engine & Configuration
- **Engine**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Primary Keys**: UUID v4
- **Referential Integrity**: Foreign key constraints with explicit cascade and set-null rules.

## 2. Implemented Domain Models (Milestones 01, 02, 03, 04)

### Multi-Tenancy, Users & Authentication
- **`User`**: Account identity, Argon2id `passwordHash`, profile attributes, verification flag.
- **`Organization`**: Multi-tenant workspace boundary.
- **`OrganizationMember`**: Composite key `[organizationId, userId]`, `OrganizationRole` enum (`OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`).
- **`Invitation`**: Token-hashed member invitations with 7-day expiration and status tracking.
- **`RefreshToken`**: SHA-256 hashed refresh tokens with family tracking and reuse detection.
- **`VerificationToken`**: One-time email verification and password reset tokens.
- **`AuditLog`**: Non-repudiable audit logs across organizations, projects, and users.

### Project Management Domain (Milestone 03)
- **`Project`**:
  - `id`: UUID Primary Key
  - `organizationId`: Foreign key to `Organization` (Cascade delete)
  - `name`: Project display name (e.g. "Core Banking Platform")
  - `key`: Organization-unique alphanumeric code (e.g. "CORE", "API")
  - `description`: Textual summary
  - `objectives`: Quality engineering and testing goals
  - `status`: `ProjectStatus` enum (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`)
  - `isArchived`: Boolean flag for soft-archive state
  - `archivedAt`: Timestamp of archival
  - `settings`: JSON configuration object
  - Constraints & Indexes:
    - `@@unique([organizationId, key])` (enforces project key uniqueness per organization)
    - `@@index([organizationId])`
    - `@@index([organizationId, status])`
    - `@@index([organizationId, isArchived])`

- **`ProjectMember`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `userId`: Foreign key to `User` (Cascade delete)
  - `role`: `ProjectRole` enum (`PROJECT_LEAD`, `MEMBER`, `VIEWER`)
  - `createdAt`, `updatedAt`: Timestamps
  - Constraints:
    - `@@unique([projectId, userId])`
    - Cross-tenant validation: System verifies `userId` is an active member of `project.organizationId` before insertion.

- **`Environment`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `name`: Target name (e.g. "Development", "Staging", "Production")
  - `type`: String classification (`DEVELOPMENT`, `TESTING`, `STAGING`, `PRODUCTION`, `CUSTOM`)
  - `url`: Optional target endpoint or base URL
  - `description`: Environment summary
  - `variables`: JSON configuration dictionary (sensitive values redacted in API responses)
  - `isActive`: Boolean status flag
  - Constraints:
    - `@@unique([projectId, name])` (unique environment name per project)
    - `@@index([projectId])`

### Milestone & Test Management Domain (Milestone 04)

- **`Milestone`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `name`: Milestone name (e.g. "Release 1.0", "Sprint 42 Hardening")
  - `description`: Detailed description
  - `objectives`: Milestone exit criteria & quality goals
  - `status`: `MilestoneStatus` enum (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `CANCELLED`)
  - `priority`: `Priority` enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `startDate`, `dueDate`: Optional temporal bounding (`dueDate >= startDate`)
  - `ownerId`: Optional foreign key to `User` (assigned owner)
  - Dynamic Progress: Evaluated on read by aggregating real test execution results (`PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`) and linked defect resolution states.
  - Constraints & Indexes:
    - `@@unique([projectId, name])`
    - `@@index([projectId])`
    - `@@index([projectId, status])`

- **`TestSuite`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `parentId`: Optional foreign key to `TestSuite` (enables unlimited nested hierarchies)
  - `name`: Folder / Suite display name
  - `description`: Suite purpose
  - `objectives`: Suite testing objectives
  - Hierarchy Safety: Backend checks entire ancestor chain to prevent self-parenting and cyclic graph loops.
  - Constraints & Indexes:
    - `@@unique([projectId, parentId, name])`
    - `@@index([projectId])`
    - `@@index([parentId])`

- **`Tag`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `name`: Tag label (e.g. "smoke", "regression", "auth")
  - `color`: Hex color representation
  - Constraints & Indexes:
    - `@@unique([projectId, name])` (unique tag label per project)
    - `@@index([projectId])`

- **`TestCase`**:
  - `id`: UUID Primary Key
  - `projectId`: Foreign key to `Project` (Cascade delete)
  - `suiteId`: Optional foreign key to `TestSuite` (Set Null on suite delete)
  - `milestoneId`: Optional foreign key to `Milestone` (Set Null on milestone delete)
  - `caseNumber`: Project-scoped sequential integer (e.g., `CORE-101`)
  - `title`: Test case summary
  - `description`: Detailed scope
  - `preconditions`: Prerequisites before test execution
  - `objectives`: Specific test objectives
  - `type`: `TestCaseType` enum (`FUNCTIONAL`, `REGRESSION`, `SMOKE`, `INTEGRATION`, `E2E`, `PERFORMANCE`, `SECURITY`, `ACCESSIBILITY`, `API`)
  - `priority`: `Priority` enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `status`: `TestCaseStatus` enum (`DRAFT`, `ACTIVE`, `DEPRECATED`)
  - `estimatedTimeMin`: Execution duration estimation in minutes
  - `authorId`: Foreign key to `User` (test case creator)
  - `tags`: Many-to-many relationship with `Tag`
  - Deletion Safeguard: Blocked if test executions are linked in any `TestRun`.
  - Constraints & Indexes:
    - `@@unique([projectId, caseNumber])`
    - `@@index([projectId])`
    - `@@index([projectId, suiteId])`
    - `@@index([projectId, status])`
    - `@@index([projectId, priority])`

- **`TestCaseVersion`**:
  - `id`: UUID Primary Key
  - `testCaseId`: Foreign key to `TestCase` (Cascade delete)
  - `versionNumber`: Incremental version number (1, 2, 3...)
  - `title`, `description`, `preconditions`, `objectives`: Snapshot of test content
  - `type`, `priority`, `status`: Snapshot of classification
  - `changeSummary`: Textual record of what changed between versions
  - `createdById`: Foreign key to `User` who authored this version
  - `createdAt`: Immutable timestamp
  - `steps`: One-to-many relation to `TestStep`
  - Constraints & Indexes:
    - `@@unique([testCaseId, versionNumber])`
    - `@@index([testCaseId])`

- **`TestStep`**:
  - `id`: UUID Primary Key
  - `testCaseVersionId`: Foreign key to `TestCaseVersion` (Cascade delete)
  - `stepNumber`: 1-based ordering index
  - `action`: Step instruction
  - `testData`: Input arguments or parameters
  - `expectedResult`: Verifiable outcome
  - Constraints & Indexes:
    - `@@unique([testCaseVersionId, stepNumber])`
    - `@@index([testCaseVersionId])`

---

## 7. Milestone 05 — Test Planning & Execution Schema

### 7.1 Enums

- **`TestPlanStatus`**: `DRAFT`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`
- **`TestRunStatus`**: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `ABORTED`
- **`ExecutionStatus`**: `NOT_RUN`, `PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`, `RETEST`

### 7.2 Tables & Models

#### `TestPlan`
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`)
  - `planNumber`: Int (Auto-incremented per project)
  - `milestoneId`: UUID (Nullable Foreign Key -> `Milestone`)
  - `environmentId`: UUID (Nullable Foreign Key -> `Environment`)
  - `managerId`: UUID (Nullable Foreign Key -> `User`)
  - `name`: VarChar(200)
  - `description`: Text?
  - `objectives`: Text?
  - `scope`: Text?
  - `strategy`: Text?
  - `status`: `TestPlanStatus` (Default: `PLANNED`)
  - `priority`: `TestPriority` (Default: `MEDIUM`)
  - `entryCriteria`: Text?
  - `exitCriteria`: Text?
  - `startDate`: DateTime?
  - `endDate`: DateTime?
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([projectId, planNumber])`
  - `@@index([projectId, status])`
  - `@@index([milestoneId])`

#### `TestPlanCase`
- Links a test case and its exact immutable version snapshot to a test plan.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `testPlanId`: UUID (Foreign Key -> `TestPlan`, `onDelete: Cascade`)
  - `testCaseId`: UUID (Foreign Key -> `TestCase`)
  - `testCaseVersionId`: UUID? (Foreign Key -> `TestCaseVersion`)
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([testPlanId, testCaseId])`
  - `@@index([testCaseVersionId])`

#### `TestRun`
- Represents an execution run workbench.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `runNumber`: Int (Auto-incremented per project)
  - `testPlanId`: UUID? (Foreign Key -> `TestPlan`)
  - `milestoneId`: UUID? (Foreign Key -> `Milestone`)
  - `environmentId`: UUID? (Foreign Key -> `Environment`)
  - `assignedToId`: UUID? (Foreign Key -> `User`)
  - `createdById`: UUID? (Foreign Key -> `User`)
  - `name`: VarChar(200)
  - `description`: Text?
  - `status`: `TestRunStatus` (Default: `NOT_STARTED`)
  - `isAutomated`: Boolean (Default: `false`)
  - `startedAt`: DateTime?
  - `completedAt`: DateTime?
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([projectId, runNumber])`
  - `@@index([projectId, status])`
  - `@@index([testPlanId])`

#### `TestRunCase`
- Individual test case assigned to a test run.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `testRunId`: UUID (Foreign Key -> `TestRun`, `onDelete: Cascade`)
  - `testCaseVersionId`: UUID (Foreign Key -> `TestCaseVersion`)
  - `assignedToId`: UUID? (Foreign Key -> `User`)
  - `status`: `ExecutionStatus` (Default: `NOT_RUN`)
  - `orderIndex`: Int (Default: 0)
  - `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([testRunId, testCaseVersionId])`
  - `@@index([testRunId, status])`
  - `@@index([assignedToId])`

#### `TestResult`
- Immutable record for every execution attempt.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `testRunCaseId`: UUID (Foreign Key -> `TestRunCase`, `onDelete: Cascade`)
  - `executedById`: UUID? (Foreign Key -> `User`)
  - `attemptNumber`: Int (Default: 1, incremental for retests)
  - `status`: `ExecutionStatus`
  - `actualResult`: Text?
  - `comment`: Text?
  - `failureReason`: Text?
  - `durationMs`: Int?
  - `executedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([testRunCaseId, attemptNumber])`
  - `@@index([testRunCaseId, executedAt])`
  - `@@index([executedById])`

#### `TestExecutionStep`
- Step-level recorded outcome for an execution attempt.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `testResultId`: UUID (Foreign Key -> `TestResult`, `onDelete: Cascade`)
  - `stepNumber`: Int
  - `status`: `ExecutionStatus`
  - `actualResult`: Text?
  - `comment`: Text?
  - `durationMs`: Int?
- **Constraints & Indexes**:
  - `@@unique([testResultId, stepNumber])`

#### `Attachment`
- Defect evidence, logs, and screenshots.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID? (Foreign Key -> `Project`)
  - `testResultId`: UUID? (Foreign Key -> `TestResult`)
  - `defectId`: UUID?
  - `uploadedById`: UUID? (Foreign Key -> `User`)
  - `fileName`: VarChar(255)
  - `fileSize`: Int
  - `mimeType`: VarChar(100)
  - `storageKey`: VarChar(255)?
  - `fileUrl`: VarChar(500)
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([testResultId])`
  - `@@index([projectId])`
