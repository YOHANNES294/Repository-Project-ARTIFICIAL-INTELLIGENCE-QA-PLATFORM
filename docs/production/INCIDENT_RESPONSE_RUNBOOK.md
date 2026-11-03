# Artificial Intelligence QA Platform
## Incident Response Runbook & Reliability Protocols

**Document Version:** 1.0.0  
**Target Audience:** SREs, DevOps Engineers, On-Call Architects, Security Incident Response Team (SIRT)  
**Last Updated:** November 3, 2026  

---

## 1. Incident Severity Matrix & SLAs

| Severity | Definition | Target Ack Time | Resolution SLA | Escalation Target |
| :--- | :--- | :--- | :--- | :--- |
| **P1 - CRITICAL** | Full platform outage, critical data loss, active security breach, or total database unavailability. | **< 15 minutes** | < 2 hours | VP Engineering, Principal Architect, SIRT |
| **P2 - MAJOR** | Major feature impaired (e.g., test execution runs failing, worker queues halted, billing webhooks dropping), but core platform accessible. | **< 30 minutes** | < 6 hours | Engineering Lead, Infrastructure Lead |
| **P3 - MINOR** | Non-critical component degraded (e.g. flaky AI suggestions, delayed email digest, export timeouts) with available workaround. | **< 2 hours** | < 24 hours | On-Call Squad Engineer |
| **P4 - LOW** | Cosmetic issues, documentation defects, minor admin dashboard UI alignment bugs. | Next Business Day | Next Sprint | Product / Engineering Backlog |

---

## 2. Incident Roles & Responsibilities

For **P1 and P2 incidents**, immediately establish the incident command structure:

1. **Incident Commander (IC):**
   - Owns the triage timeline and overall decision-making authority.
   - Ensures updates are posted to status channels every 30 minutes for P1, 60 minutes for P2.
2. **Technical Lead / Lead Investigator:**
   - Coordinates debugging, root-cause isolation, and hotfix development.
   - Does not post status updates; focuses 100% on remediation.
3. **Communications Lead:**
   - Manages communication with affected tenant administrators, executive leadership, and legal/compliance (if data security is implicated).

---

## 3. Standard Diagnostic Procedures

### 3.1 Database Connection Pool Exhaustion or High Latency

**Symptoms:**
- API logs report: `PrismaClientInitializationError: Can't reach database server` or `Timed out fetching a new connection from the connection pool`.
- `/api/v1/health/ready` returns HTTP 503 Service Unavailable.

**Diagnostic Commands:**
```bash
# Check active PostgreSQL connections by application
psql $DATABASE_URL -c "
SELECT count(*), application_name, state 
FROM pg_stat_activity 
GROUP BY application_name, state;
"

# Identify long-running blocking queries (> 30s)
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
AND state != 'idle';
"
```

**Remediation:**
1. Terminate hanging idle-in-transaction connections:
   ```bash
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND (now() - query_start) > interval '2 minutes';
   ```
2. If connection pooling is saturated, increase `connection_limit` or restart PgBouncer / API replicas gradually.

---

### 3.2 Redis & BullMQ Worker Stalls or Queue Backlog

**Symptoms:**
- Outbound webhooks, notifications, or automated test ingestions are not processing.
- Dead-Letter Queue (DLQ) count increasing in Redis metrics.

**Diagnostic Commands:**
```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# Check queue length
LLEN "bull:notification-queue:wait"
LLEN "bull:notification-queue:active"
LLEN "bull:notification-queue:failed"

# Check memory status
INFO memory
```

**Remediation:**
1. Check worker container logs for uncaught exceptions:
   ```bash
   docker logs --tail 100 ai-qa-worker
   ```
2. Verify Redis memory policy is set to `noeviction` for BullMQ durability.
3. Scale worker replicas up to clear backlogged jobs:
   ```bash
   # Docker Compose
   docker compose -f docker-compose.prod.yml up -d --scale worker=4
   # Kubernetes
   kubectl scale deployment ai-qa-worker --replicas=5 -n ai-qa-prod
   ```

---

### 3.3 Elevated API Error Rate (5xx Spikes)

**Symptoms:**
- Prometheus alert: `High5xxRate: > 2% HTTP 500 errors in 5m`.

**Diagnostic Commands:**
```bash
# Inspect live Prometheus metrics
curl -s https://qa-platform.yourcompany.com/api/v1/metrics/json | jq '.requests, .statusCodes'

# Tail API error logs
kubectl logs -f -l app=ai-qa-api -n ai-qa-prod | grep "ERROR"
```

**Remediation:**
1. Check for bad deployment: If error spike started immediately following a new release, initiate rollback:
   ```bash
   kubectl rollout undo deployment/ai-qa-api -n ai-qa-prod
   ```
2. If an unhandled third-party service is timing out (e.g. AI provider outage), verify that circuit breakers or fallback logic are handling errors without throwing.

---

## 4. Emergency Containment & Security Protocols

### 4.1 Malicious Tenant or Compromised API Token

If a tenant account is compromised or engaging in abusive behavior:

1. **Suspend Tenant Immediately via Super Admin API:**
   ```bash
   curl -X POST https://qa-platform.yourcompany.com/api/v1/platform/organizations/<ORG_ID>/suspend \
     -H "Authorization: Bearer $SUPER_ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Security incident containment - suspicious outbound webhook traffic"}'
   ```
   *Effect:* All users belonging to the organization are immediately blocked by `requireTenantAccess` with HTTP 403 Forbidden.

2. **Revoke Specific Automation Tokens:**
   ```bash
   # Mark token revoked directly in database
   psql $DATABASE_URL -c "UPDATE \"AutomationApiToken\" SET \"isActive\" = false WHERE \"id\" = '<TOKEN_ID>';"
   ```

### 4.2 Emergency Secret Rotation (Master Encryption Key / JWT Secrets)

In the event of an environment variable or key compromise:

1. Generate new secrets:
   ```bash
   openssl rand -hex 64 # New JWT Secret
   openssl rand -hex 32 # New AES-256 Key
   ```
2. Update deployment secret configuration and trigger a rolling restart of all API instances.
3. Note: Rotating `JWT_SECRET` immediately invalidates all active sessions, requiring users to log back in.

---

## 5. Post-Incident Review (PIR) Template

Within 48 hours of resolving any P1 or P2 incident, complete a blameless post-mortem covering:

1. **Incident Summary:** What happened, timeline, user impact.
2. **Root Cause Analysis (5 Whys):** The fundamental underlying flaw that allowed the failure to occur.
3. **What Went Well:** Swift detection, automated failover, runbook accuracy.
4. **What Went Poorly:** Alert delays, missing metrics, slow coordination.
5. **Action Items & Preventative Remediation:** Concrete Jira / Linear tickets assigned with target completion dates to prevent recurrence.
