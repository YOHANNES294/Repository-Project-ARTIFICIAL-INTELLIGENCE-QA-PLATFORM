# API Specification (/api/v1)

## 1. Conventions
- Base Path: `/api/v1`
- Content Type: `application/json`
- Response Envelopes:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```
Error Response:
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

## 2. Implemented Foundation Endpoints
### `GET /api/v1/health`
Assesses overall system health across database, Redis, and worker threads.
- **Response (200/503)**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-11-02T16:00:00.000Z",
    "uptime": 12.34,
    "version": "0.1.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "worker": "running"
    }
  }
}
```

### `GET /api/v1/health/live`
Container and process liveness probe.
- **Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "live",
    "timestamp": "2026-11-02T16:00:00.000Z",
    "uptime": 12.34
  }
}
```

### `GET /api/v1/health/ready`
Readiness probe verifying PostgreSQL availability.
- **Response (200/503)**
