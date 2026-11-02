# Database Architecture & Schema Specification

## 1. Engine & Configuration
- **Engine**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Primary Keys**: UUID v4
- **Referential Integrity**: Foreign key constraints with explicit cascade and set-null rules.

## 2. Implemented Domain Models (Milestones 01, 02, 03)

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
