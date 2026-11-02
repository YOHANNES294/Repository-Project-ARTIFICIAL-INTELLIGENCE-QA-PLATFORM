# Database Architecture & Schema Specification

## 1. Engine & Configuration
- **Engine**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Primary Keys**: UUID v4
- **Referential Integrity**: Foreign key constraints with explicit cascade and set-null rules.

## 2. Implemented Domain Models (Milestone 01 & 02)

### Authentication & Session Management
- **`User`**:
  - `id`: UUID Primary Key
  - `email`: Unique index, case-insensitive normalized
  - `passwordHash`: Argon2id hashed password string
  - `firstName`, `lastName`: Profile attributes
  - `isEmailVerified`: Boolean flag
  - `isSuperAdmin`: Platform administration flag
- **`RefreshToken`**:
  - `id`: UUID Primary Key
  - `userId`: Foreign key to `User` (Cascade delete)
  - `organizationId`: Optional active tenant context
  - `tokenHash`: Unique SHA-256 hash (never plaintext)
  - `familyId`: UUID grouping rotation chain for reuse detection
  - `isRevoked`: Boolean revocation flag
  - `expiresAt`: Timestamp
  - `ipAddress`, `userAgent`: Device telemetry
- **`VerificationToken`**:
  - `id`: UUID Primary Key
  - `identifier`: Email address
  - `tokenHash`: SHA-256 hash of random token
  - `type`: `EMAIL_VERIFICATION` | `PASSWORD_RESET`
  - `expiresAt`: Expiration timestamp

### Multi-Tenancy & SaaS Organization Models
- **`Organization`**:
  - `id`: UUID Primary Key
  - `name`: Organization display name
  - `slug`: Unique URL-friendly slug
  - `members`: Relation to `OrganizationMember`
  - `subscription`: SaaS billing status
- **`OrganizationMember`**:
  - `organizationId`, `userId`: Composite unique key (`organizationId_userId`)
  - `role`: `OrganizationRole` enum (`OWNER`, `ADMINISTRATOR`, `QA_MANAGER`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `VIEWER`)
- **`Invitation`**:
  - `organizationId`: Foreign key to `Organization`
  - `email`: Target invitee email
  - `role`: Assigned initial role
  - `tokenHash`: Unique SHA-256 hash of invitation token
  - `status`: `PENDING` | `ACCEPTED` | `REVOKED` | `EXPIRED`
  - `expiresAt`, `acceptedAt`: Timestamps
- **`AuditLog`**:
  - `organizationId`: Tenant boundary
  - `userId`: Acting user
  - `action`: Audit event name (e.g. `USER_LOGIN`, `MEMBER_INVITED`)
  - `entityType`, `entityId`: Modified resource
  - `metadata`: JSON payload

### Core QA Domain Models (Ready for Subsequent Milestones)
- `Project`, `ProjectMember`, `Environment`
- `Milestone`, `TestSuite`, `TestCase`, `TestCaseVersion`, `TestStep`
- `TestPlan`, `TestPlanCase`, `TestRun`, `TestRunCase`, `TestResult`, `TestExecutionStep`
- `Defect`, `DefectAssignment`, `DefectComment`, `DefectHistory`, `DefectTestLink`
- `AIGeneration`, `AIGenerationItem`, `AIAnalysisResult`, `AIUsageLog`
