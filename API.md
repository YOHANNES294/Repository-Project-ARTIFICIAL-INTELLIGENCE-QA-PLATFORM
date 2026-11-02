# API Specification (/api/v1)

## 1. Conventions
- Base Path: `/api/v1`
- Content Type: `application/json`
- Session Security: HTTP-only, Secure, SameSite=Strict cookies (`accessToken`, `refreshToken`), plus optional `Authorization: Bearer <token>` support.
- Tenant Header: `x-organization-id` (explicitly validated against user's server-side memberships).

### Standard Response Envelopes
Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```
Error:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## 2. Health Endpoints
- `GET /api/v1/health`: Overall health assessment (Database, Redis, Worker).
- `GET /api/v1/health/live`: Process liveness probe.
- `GET /api/v1/health/ready`: Database connectivity readiness probe.

---

## 3. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a user account, default organization, ownership membership (`OWNER`), Free tier subscription, issues session tokens, and sets HTTP-only cookies.
- **Rate Limit**: 30 req / 15 min.
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Doe",
  "organizationName": "Acme QA Corp"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "isEmailVerified": false
    },
    "organization": {
      "id": "uuid",
      "name": "Acme QA Corp",
      "slug": "acme-qa-corp-abc"
    },
    "accessToken": "jwt-token"
  }
}
```

### `POST /api/v1/auth/login`
Authenticates credentials with Argon2id, creates a new refresh token family, and sets HTTP-only session cookies.
- **Rate Limit**: 30 req / 15 min.
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "organization": { ... },
    "role": "OWNER",
    "accessToken": "jwt-token"
  }
}
```

### `POST /api/v1/auth/refresh`
Performs refresh token rotation. Issues a new access token and rotated refresh token in the same token family. If an already-revoked refresh token is presented, detects token reuse and invalidates all active sessions in the family.
- **Cookies**: `refreshToken` (HTTP-only)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "organizationId": "uuid"
  }
}
```

### `POST /api/v1/auth/logout`
Revokes current refresh token session in database, clears session cookies, and records audit trail.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

### `POST /api/v1/auth/forgot-password`
Initiates password reset. Timing-safe enumeration defense (always returns success).
- **Request Body**:
```json
{ "email": "user@example.com" }
```
- **Response (200 OK)**

### `POST /api/v1/auth/reset-password`
Resets password with valid verification token, hashes new password with Argon2id, and invalidates all existing sessions.
- **Request Body**:
```json
{
  "token": "reset-token",
  "newPassword": "NewPassword123!"
}
```
- **Response (200 OK)**

### `POST /api/v1/auth/verify-email`
Verifies user email with token.
- **Request Body**:
```json
{ "token": "verify-token" }
```
- **Response (200 OK)**

### `GET /api/v1/auth/me`
Retrieves authenticated user profile and active organization context.
- **Headers**: `Authorization: Bearer <token>` or `accessToken` cookie.
- **Response (200 OK)**

---

## 4. Organization Endpoints (`/api/v1/organizations`)

### `POST /api/v1/organizations`
Creates a new organization with the caller as `OWNER`.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{ "name": "New Organization" }
```
- **Response (201 Created)**

### `GET /api/v1/organizations`
Lists all organizations the caller belongs to along with their role in each.
- **Response (200 OK)**

### `POST /api/v1/organizations/switch`
Switches active organization context and returns an updated access token.
- **Request Body**:
```json
{ "organizationId": "uuid" }
```
- **Response (200 OK)**

### `GET /api/v1/organizations/:orgId/members`
Lists all members in the organization.
- **Security**: Requires membership in `orgId` (Strict Tenant Isolation).
- **Response (200 OK)**

### `POST /api/v1/organizations/:orgId/invitations`
Invites a new member by email with specified role.
- **Security**: Requires `OWNER` or `ADMINISTRATOR` role in `orgId`.
- **Request Body**:
```json
{
  "email": "colleague@example.com",
  "role": "QA_ENGINEER"
}
```
- **Response (201 Created)**

### `POST /api/v1/organizations/invitations/accept`
Accepts an invitation and adds caller to the organization.
- **Request Body**:
```json
{ "token": "invitation-token" }
```
- **Response (200 OK)**

### `PATCH /api/v1/organizations/:orgId/members/:memberId`
Updates a member's role. Prevents demoting the sole organization Owner.
- **Security**: Requires `OWNER` or `ADMINISTRATOR`.
- **Request Body**:
```json
{ "role": "QA_MANAGER" }
```
- **Response (200 OK)**

### `DELETE /api/v1/organizations/:orgId/members/:memberId`
Removes a member from the organization. Prevents removing the sole organization Owner.
- **Security**: Requires `OWNER` or `ADMINISTRATOR`.
- **Response (200 OK)**
