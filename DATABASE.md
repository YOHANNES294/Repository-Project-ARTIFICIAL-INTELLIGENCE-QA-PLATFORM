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

---

### 7. Milestone 06 — Defect Management & Bug Tracking Models

#### `Defect`
- Full-fidelity bug tracking entity.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `defectNumber`: Int (Auto-incremented per project)
  - `title`: VarChar(255)
  - `description`: Text
  - `stepsToRepro`: Text?
  - `expectedResult`: Text?
  - `actualResult`: Text?
  - `browser`: VarChar(100)?
  - `os`: VarChar(100)?
  - `appVersion`: VarChar(100)?
  - `device`: VarChar(100)?
  - `component`: VarChar(100)?
  - `severity`: `DefectSeverity` (`CRITICAL`, `HIGH`, `MAJOR`, `MEDIUM`, `MODERATE`, `LOW`, `MINOR`, `TRIVIAL`)
  - `priority`: `DefectPriority` (`URGENT`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
  - `status`: `DefectStatus` (`NEW`, `OPEN`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `FIXED`, `READY_FOR_RETEST`, `VERIFIED`, `CLOSED`, `REOPENED`, `REJECTED`, `DUPLICATE`)
  - `type`: `DefectType` (`FUNCTIONAL`, `UI`, `API`, `PERFORMANCE`, `SECURITY`, `ACCESSIBILITY`, `DATA`, `INTEGRATION`, `OTHER`)
  - `environmentId`: UUID? (Foreign Key -> `Environment`)
  - `milestoneId`: UUID? (Foreign Key -> `Milestone`)
  - `reporterId`: UUID (Foreign Key -> `User`)
  - `assigneeId`: UUID? (Foreign Key -> `User`)
  - `qaOwnerId`: UUID? (Foreign Key -> `User`)
  - `dueDate`: DateTime?
  - `resolution`: Text?
  - `rootCause`: Text?
  - `resolvedAt`: DateTime?
  - `closedAt`: DateTime?
  - `duplicateOfId`: UUID? (Self-relation -> `Defect`)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([projectId, defectNumber])`
  - `@@index([projectId, status])`
  - `@@index([projectId, severity])`
  - `@@index([assigneeId])`
  - `@@index([qaOwnerId])`
  - `@@index([duplicateOfId])`

#### `DefectComment`
- Threaded discussions and staff internal notes.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `defectId`: UUID (Foreign Key -> `Defect`, `onDelete: Cascade`)
  - `userId`: UUID (Foreign Key -> `User`)
  - `parentId`: UUID? (Self-relation -> `DefectComment`, for threaded replies)
  - `content`: Text
  - `isInternal`: Boolean (Default: `false`, strictly hidden from `VIEWER` users)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([defectId, createdAt])`
  - `@@index([parentId])`

#### `DefectHistory`
- Immutable field-level audit trail.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `defectId`: UUID (Foreign Key -> `Defect`, `onDelete: Cascade`)
  - `userId`: UUID (Foreign Key -> `User`)
  - `field`: VarChar(100)
  - `oldValue`: Text?
  - `newValue`: Text?
  - `reason`: Text?
  - `changedAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([defectId, changedAt])`

#### `DefectTestLink`
- Bidirectional traceability between defects and test artifacts.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `defectId`: UUID (Foreign Key -> `Defect`, `onDelete: Cascade`)
  - `testCaseId`: UUID? (Foreign Key -> `TestCase`)
  - `testResultId`: UUID? (Foreign Key -> `TestResult`)
  - `testRunId`: UUID? (Foreign Key -> `TestRun`)
- **Constraints & Indexes**:
  - `@@unique([defectId, testCaseId, testResultId])`
  - `@@index([testCaseId])`
  - `@@index([testRunId])`

---

## 3. Milestone 07 — AI Intelligence Engine Schema Models

### AI Configuration & Telemetry

#### `AIProviderConfig`
- Organization-scoped AI provider credentials and model runtime options.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `provider`: `AIProviderType` (`MOCK`, `OPENAI`, `ANTHROPIC`, `GEMINI`)
  - `model`: String (e.g. `gpt-4o-mini`, `claude-3-5-haiku`, `gemini-2.0-flash`)
  - `apiKeyEncrypted`: Text? (AES-256-GCM ciphertext)
  - `apiKeyIv`: Text? (12-byte initialization vector, hex-encoded)
  - `apiKeyTag`: Text? (16-byte authentication tag, hex-encoded)
  - `endpointUrl`: Text? (Custom or proxy LLM endpoint)
  - `temperature`: Float (Default: 0.2)
  - `maxTokens`: Int (Default: 2048)
  - `rateLimitPerMinute`: Int (Default: 60)
  - `rateLimitPerDay`: Int (Default: 1000)
  - `isEnabled`: Boolean (Default: true)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([organizationId, provider])`
  - `@@index([organizationId])`

#### `AIPromptTemplate`
- Versioned system prompt templates with variable interpolation.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `taskType`: `AITaskType` (`TEST_GENERATION`, `FAILURE_ANALYSIS`, `DUPLICATE_DETECTION`, `RISK_ANALYSIS`, `QA_SUMMARY`)
  - `version`: Int
  - `name`: String
  - `template`: Text
  - `systemPrompt`: Text?
  - `variables`: JSON (Input schema and parameter documentation)
  - `isActive`: Boolean (Default: true)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([taskType, version])`

### AI Operations & Generation Storage

#### `AIGeneration`
- Session header for every batch generation request.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `userId`: UUID (Foreign Key -> `User`, creator/requester)
  - `taskType`: `AITaskType`
  - `provider`: `AIProviderType`
  - `model`: String
  - `prompt`: Text (Sanitized prompt string)
  - `status`: `AIGenerationStatus` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`)
  - `tokensPrompt`: Int (Default: 0)
  - `tokensCompletion`: Int (Default: 0)
  - `tokensTotal`: Int (Default: 0)
  - `costEstimate`: Float (Default: 0.0)
  - `latencyMs`: Int (Default: 0)
  - `metadata`: JSON?
  - `errorMessage`: Text?
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([projectId, taskType])`
  - `@@index([organizationId, createdAt])`

#### `AIGenerationItem`
- Individual proposed entity generated by an AI task (e.g. proposed test case).
- **Fields**:
  - `id`: UUID (Primary Key)
  - `generationId`: UUID (Foreign Key -> `AIGeneration`, `onDelete: Cascade`)
  - `itemType`: String (e.g. `TEST_CASE`)
  - `proposedData`: JSON (Structured test case payload)
  - `reviewStatus`: `AIReviewStatus` (`PROPOSED`, `ACCEPTED`, `REJECTED`, `EDITED`)
  - `reviewedById`: UUID? (Foreign Key -> `User`)
  - `reviewedAt`: DateTime?
  - `reviewNotes`: Text?
  - `acceptedEntityId`: UUID? (Links to officially committed `TestCase.id`)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([generationId, reviewStatus])`
  - `@@index([acceptedEntityId])`

#### `AIAnalysisResult`
- Persisted root-cause analyses, duplicate similarity rankings, and risk reports.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `generationId`: UUID (Foreign Key -> `AIGeneration`, `onDelete: Cascade`)
  - `targetType`: String (`TEST_RESULT`, `DEFECT`, `PROJECT`, `MILESTONE`)
  - `targetId`: UUID
  - `confidenceScore`: Float? (0.00 to 1.00)
  - `summary`: Text
  - `rootCauseHypothesis`: Text?
  - `recommendedAction`: Text?
  - `structuredPayload`: JSON (Detailed diagnostics, breakdown maps, step suggestions)
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([targetType, targetId])`
  - `@@index([generationId])`

### AI Governance & Feedback

#### `AIUsageLog`
- Audit log of LLM invocations for token counting, cost tracking, and quota enforcement.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `projectId`: UUID? (Foreign Key -> `Project`, `onDelete: SetNull`)
  - `userId`: UUID (Foreign Key -> `User`)
  - `provider`: `AIProviderType`
  - `model`: String
  - `taskType`: `AITaskType`
  - `tokensPrompt`: Int
  - `tokensCompletion`: Int
  - `costEstimate`: Float
  - `latencyMs`: Int
  - `isSuccess`: Boolean
  - `errorCode`: String?
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([organizationId, createdAt])`
  - `@@index([projectId, createdAt])`

#### `AIFeedback`
- End-user rating and quality evaluations of AI suggestions.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `generationId`: UUID (Foreign Key -> `AIGeneration`, `onDelete: Cascade`)
  - `userId`: UUID (Foreign Key -> `User`)
  - `rating`: `AIFeedbackRating` (`HELPFUL`, `NOT_HELPFUL`, `INACCURATE`, `INCOMPLETE`)
  - `comment`: Text?
  - `corrections`: JSON?
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([generationId])`
  - `@@index([userId])`

#### `AIEvaluation`
- Benchmark evaluation suite results for measuring LLM accuracy across releases.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `taskType`: `AITaskType`
  - `datasetName`: String
  - `accuracyScore`: Float
  - `relevanceScore`: Float
  - `latencyAvgMs`: Int
  - `sampleCount`: Int
  - `details`: JSON?
  - `createdAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([organizationId, taskType])`

#### `AIEmbedding`
- Vector embedding storage for semantic search and duplicate bug discovery.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `entityType`: String (`DEFECT`, `TEST_CASE`, `REQUIREMENT`)
  - `entityId`: UUID
  - `model`: String
  - `dimensions`: Int
  - `embedding`: JSON (Vector coordinate array for pgvector / fallback cosine computation)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([entityType, entityId, model])`

---

## 4. Milestone 08 — Automation & CI/CD Schema Models

### Credentials & Security

#### `AutomationApiToken`
- Scoped API tokens for CI/CD runners (Playwright, Newman, GitHub Actions).
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `name`: String (e.g. "GitHub Actions CI Runner")
  - `tokenPrefix`: String (e.g. `aiqa_auto_abc12345`)
  - `tokenHash`: String (Unique SHA-256 hash of raw token)
  - `scopes`: String[] (Default: `["automation:ingest"]`)
  - `lastUsedAt`: DateTime?
  - `expiresAt`: DateTime?
  - `isRevoked`: Boolean (Default: false)
  - `revokedAt`: DateTime?
  - `createdById`: UUID? (Foreign Key -> `User`, `onDelete: SetNull`)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([tokenHash])`
  - `@@index([projectId, isRevoked])`
  - `@@index([organizationId])`

### Test Mappings & Associations

#### `AutomationTestMapping`
- Mapping between external runner test identifiers and platform TestCases.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `testCaseId`: UUID (Foreign Key -> `TestCase`, `onDelete: Cascade`)
  - `externalId`: String (Unique external ID, e.g. "tests/auth.spec.ts::User should log in")
  - `externalTitle`: String
  - `framework`: String (Default: "PLAYWRIGHT")
  - `confidence`: Float (Default: 1.0)
  - `isVerified`: Boolean (Default: true)
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([projectId, externalId])`
  - `@@index([projectId])`
  - `@@index([testCaseId])`

### Ingestion Sessions & Webhooks

#### `AutomationSession`
- Execution session metadata capturing CI context and linking to platform `TestRun`.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `organizationId`: UUID (Foreign Key -> `Organization`, `onDelete: Cascade`)
  - `testRunId`: UUID? (Foreign Key -> `TestRun`, `onDelete: SetNull`)
  - `idempotencyKey`: String? (Deduplication token)
  - `framework`: String (Default: "PLAYWRIGHT")
  - `status`: String (Default: "INITIALIZED")
  - `environmentId`: UUID?
  - `milestoneId`: UUID?
  - `ciProvider`: String? (e.g. "GITHUB_ACTIONS", "LOCAL")
  - `ciBuildId`: String?
  - `ciBuildUrl`: String?
  - `gitBranch`: String?
  - `gitCommitSha`: String?
  - `gitCommitMessage`: String?
  - `gitAuthor`: String?
  - `pullRequestNumber`: Int?
  - `os`: String?
  - `browser`: String?
  - `totalTests`: Int (Default: 0)
  - `passedTests`: Int (Default: 0)
  - `failedTests`: Int (Default: 0)
  - `skippedTests`: Int (Default: 0)
  - `durationMs`: Int (Default: 0)
  - `metadata`: JSON?
  - `startedAt`: DateTime (Default: now)
  - `completedAt`: DateTime?
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@unique([projectId, idempotencyKey])`
  - `@@index([projectId, status])`
  - `@@index([organizationId])`
  - `@@index([testRunId])`

#### `AutomationUnmappedTest`
- Discovered automated tests executing in CI that are pending manual review and TestCase association.
- **Fields**:
  - `id`: UUID (Primary Key)
  - `sessionId`: UUID (Foreign Key -> `AutomationSession`, `onDelete: Cascade`)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `externalId`: String
  - `externalTitle`: String
  - `suiteName`: String?
  - `framework`: String (Default: "PLAYWRIGHT")
  - `lastSeenAt`: DateTime (Default: now)
  - `status`: String (Default: "PENDING")
  - `resolvedTestCaseId`: UUID?
  - `createdAt`, `updatedAt`: DateTime
- **Constraints & Indexes**:
  - `@@index([projectId, status])`
  - `@@index([sessionId])`

#### `AutomationWebhookEvent`
- Immutable log of received CI/CD webhooks (e.g. GitHub Actions).
- **Fields**:
  - `id`: UUID (Primary Key)
  - `projectId`: UUID (Foreign Key -> `Project`, `onDelete: Cascade`)
  - `eventId`: String (e.g. `X-GitHub-Delivery` GUID)
  - `eventType`: String (e.g. "workflow_run")
  - `signature`: String (Truncated HMAC signature)
  - `payload`: JSON
  - `status`: String (Default: "PROCESSED")
  - `errorMessage`: String?
  - `receivedAt`: DateTime (Default: now)
- **Constraints & Indexes**:
  - `@@unique([projectId, eventId])`
  - `@@index([projectId, receivedAt])`
