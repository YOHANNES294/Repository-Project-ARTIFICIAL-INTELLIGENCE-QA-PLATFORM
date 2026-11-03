# Architecture Specification

## 1. Modular Monorepo Design
The system uses a modular monolithic architecture with dedicated background processing:
1. **API Gateway & Core Service (`apps/api`)**:
   - Handles REST requests at `/api/v1`.
   - Correlation IDs (`x-request-id`) injected on every request and bound to Winston structured logs.
   - Enforces strict tenant isolation via organization context.
   - Centralized error handler transforms domain errors into standard JSON envelopes.
2. **Background Processing Service (`apps/worker`)**:
   - Asynchronous job execution using BullMQ over Redis.
   - Handles long-running AI inferences, test result parsing, notifications, and scheduled aggregations.
3. **Frontend Application (`apps/web`)**:
   - Next.js 16 with App Router and React Server/Client Components.
   - TanStack Query for server state management and caching.
   - Real-time status and telemetry dashboard.

## 2. Shared Packages
- `@ai-qa/shared-types`: Canonical domain models, DTOs, and enums.
- `@ai-qa/validation`: Zod schemas shared between frontend and backend.
- `@ai-qa/api-client`: Type-safe fetch client for communication with backend.
- `@ai-qa/ui`: Shared design tokens and utility functions.
- `@ai-qa/config`: Base compiler options and shared standards.

## 3. Reliability & Probes
- `GET /api/v1/health`: Overall health assessment combining process, database, and Redis checks.
- `GET /api/v1/health/live`: Process liveness probe.
- `GET /api/v1/health/ready`: Database and dependency readiness probe.

---

## 4. AI Intelligence Engine Architecture (Milestone 07)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Intelligence Pipeline                         │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│ 1. AI Gateway│ 2. Sanitization  │ 3. LLM Adapters │ 4. Output Validator│
│   & Tenant   │   & Injection    │   (OpenAI, Anth,│   & Human Review   │
│   Resolution │     Defense      │    Gemini, Mock)│     Commitment     │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

### 4.1 Provider-Agnostic Gateway & Adapters
The platform supports multiple LLM providers through a unified `AIProviderAdapter` interface:
- **`OpenAIAdapter`**: Connects to OpenAI Chat Completions API with JSON mode (`response_format: { type: "json_object" }`).
- **`AnthropicAdapter`**: Connects to Anthropic Messages API with structured JSON system prompts.
- **`GeminiAdapter`**: Connects to Google Gemini API (`generateContent`) using `application/json` response MIME types.
- **`MockAIAdapter`**: Deterministic, offline provider adapter requiring no external network or API keys. Used for zero-cost testing, CI verification, and offline operation.

### 4.2 Security, Credential Protection & Prompt Sanitization
- **Credential Encryption**: Provider API keys are encrypted at rest using AES-256-GCM with distinct IV and Auth Tag columns (`apiKeyEncrypted`, `apiKeyIv`, `apiKeyTag`). Plaintext keys are never saved, returned over API endpoints, or written to system logs.
- **Prompt Sanitization**: All prompts pass through `PromptSanitizer.sanitize()`, which:
  1. Redacts sensitive credentials (bearer tokens, JWTs, private keys, passwords, API keys).
  2. Neutralizes prompt injection patterns (`ignore previous instructions`, `system prompt override`, `jailbreak delimiters`).
  3. Enforces length boundaries to prevent context-overflow vulnerabilities.

### 4.3 Structured Output Validation & Schema Enforcement
LLM responses are parsed and strictly validated against domain Zod schemas before being persisted:
- Malformed or invalid JSON triggers clean fallback handling rather than unhandled server exceptions.
- Domain outputs are typed into strict TypeScript interfaces before delivery to callers.

### 4.4 Human-in-the-Loop Review Pipeline
The platform enforces human agency and verification for all AI-generated test artifacts:
- Generated test cases are initially persisted with status `PROPOSED`.
- QA engineers can review each item individually (`ACCEPTED`, `REJECTED`, `EDITED`) or batch-accept candidate groups.
- Official `TestCase` records and immutable `TestCaseVersion` entries are **only** created once a human approves the proposal.
- Every accepted test case maintains bidirectional traceability to the AI generation item and session.

### 4.5 Graceful Degradation & High Availability
- If an AI provider is unreachable, times out, or encounters rate limits, core QA workflows (manual test authoring, test execution, defect tracking, and release management) remain 100% operational.
- The system logs an `AIUsageLog` entry indicating the error code and gracefully informs the user without impacting surrounding operations.
