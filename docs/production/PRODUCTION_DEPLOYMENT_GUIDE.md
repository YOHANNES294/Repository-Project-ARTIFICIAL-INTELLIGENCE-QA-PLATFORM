# Artificial Intelligence QA Platform
## Production Deployment Guide

**Target Environment:** Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9), Docker 26+, Kubernetes 1.28+  
**Target Node Runtime:** Node.js 20 LTS or 22 LTS  
**Prisma Engine:** 6.19.3  
**Database:** PostgreSQL 15 or 16  
**Queue Store:** Redis 7+  

---

## 1. System Architecture & Topology

The Artificial Intelligence QA Platform is structured into decoupled, independently scalable production tiers:

```
                          [ Clients & CI/CD Agents ]
                                      │
                                      ▼
                        [ Reverse Proxy / Cloudflare ]
                        (TLS Termination, WAF, DDoS)
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
           [ Web Application ]                 [ REST / SSE API ]
             (Next.js 16 SSR)                   (Express 4 / Node)
             Port: 3000 / 80                     Port: 4000 / 443
                     │                                 │
                     │          Prisma ORM             │
                     └───────────────┬─────────────────┘
                                     │
                     ┌───────────────┴─────────────────┐
                     ▼                                 ▼
           [ Background Worker ]              [ PostgreSQL 16 ]
             (BullMQ Processor)              (Primary OLTP Store)
                     │
                     ▼
              [ Redis 7 Queue ]
```

---

## 2. Infrastructure Sizing Requirements

### Minimum Production Specifications (Single Node / Small Team)
- **CPU:** 4 vCPUs
- **RAM:** 8 GB RAM
- **Disk:** 50 GB NVMe SSD (Database + WAL logs)
- **Network:** 1 Gbps NIC

### Recommended Enterprise Specifications (Multi-Instance Clustered)
- **Web App (2+ Replicas):** 2 vCPUs, 4 GB RAM per replica
- **API Server (3+ Replicas):** 2 vCPUs, 4 GB RAM per replica
- **Background Worker (2+ Replicas):** 2 vCPUs, 4 GB RAM per replica
- **Managed PostgreSQL (AWS RDS / GCP Cloud SQL):** 4 vCPUs, 16 GB RAM, High-Availability Multi-AZ
- **Managed Redis (ElastiCache / Memorystore):** 2 vCPUs, 6 GB RAM, Automatic Failover
- **S3 / GCS Object Storage:** For test run attachments and report exports

---

## 3. Environment Variable Configuration

Create a production `.env` file for the API and Worker containers. **Never commit production secrets to Git.**

### 3.1 Core Database & Storage Configuration
```env
# Node Environment
NODE_ENV=production
PORT=4000

# Database Connection (Ensure connection pooling parameters)
# pgbouncer=true or connection_limit=25 recommended for multi-replica setups
DATABASE_URL="postgresql://ai_qa_prod_user:SecurePassword123!@db-primary.internal:5432/ai_qa_production?schema=public&connection_limit=20&pool_timeout=10"

# Redis Queue Connection
REDIS_URL="redis://:RedisAuthPassword123!@redis-primary.internal:6379"

# Object Storage / Attachments (local, s3, gcs)
STORAGE_DRIVER=s3
STORAGE_BUCKET=prod-ai-qa-attachments
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### 3.2 Security, Cryptography & Authentication
```env
# JWT Tokens (Use 64+ char random hex strings: openssl rand -hex 64)
JWT_SECRET="8b6e2f41c30a89d714b7e80f2d93e5a4b1c7d0e9f2a4b6c8d0e1f3a5b7c9d1e3f"
JWT_REFRESH_SECRET="e9a4c8d1f3b5a7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# AES-256-GCM Master Key for Tenant Integration & Payment Secrets (32 bytes / 64 hex chars)
ENCRYPTION_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# CORS Allowed Origins
CORS_ORIGIN="https://qa-platform.yourcompany.com"
```

### 3.3 Email, Webhooks & External Services
```env
# Mail Delivery (local, smtp, resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_123456789abcdef
EMAIL_FROM="AI QA Platform <notifications@qa-platform.yourcompany.com>"

# Webhook Outbound Delivery
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_RETRIES=5

# Super Admin Bootstrap (Initial platform provision only)
INITIAL_SUPER_ADMIN_EMAIL="security-admin@yourcompany.com"
INITIAL_SUPER_ADMIN_PASSWORD="ReplaceWithSuperSecureMasterPassword456!"
```

---

## 4. Deployment Methods

### Method 1: Docker Compose (Single Host / Small Enterprise)

The repository provides an enterprise-ready `docker-compose.prod.yml` configured with network segmentation, resource limits, and health probes.

1. **Clone repository and configure environment:**
   ```bash
   git clone https://github.com/your-org/ai-qa-platform.git /opt/ai-qa-platform
   cd /opt/ai-qa-platform
   cp .env.example .env.production
   # Edit .env.production with strong credentials
   ```

2. **Build and start services in detached mode:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

3. **Run database migrations:**
   ```bash
   docker compose -f docker-compose.prod.yml exec api pnpm prisma:migrate:deploy
   ```

4. **Verify container health:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

### Method 2: Kubernetes Deployment (High Availability / Multi-Replica)

#### Step 1: Database Migration Job
Run database migrations as a Kubernetes Job before rolling out new deployments:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ai-qa-migration-v1-0-0
  namespace: ai-qa-prod
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: your-registry.io/ai-qa/api:v1.0.0
          command: ["pnpm", "prisma", "migrate", "deploy"]
          envFrom:
            - secretRef:
                name: ai-qa-secrets
```

#### Step 2: API Deployment & Service
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-qa-api
  namespace: ai-qa-prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ai-qa-api
  template:
    metadata:
      labels:
        app: ai-qa-api
    spec:
      containers:
        - name: api
          image: your-registry.io/ai-qa/api:v1.0.0
          ports:
            - containerPort: 4000
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          livenessProbe:
            httpGet:
              path: /api/v1/health/live
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /api/v1/health/ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 10
          envFrom:
            - secretRef:
                name: ai-qa-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: ai-qa-api
  namespace: ai-qa-prod
spec:
  selector:
    app: ai-qa-api
  ports:
    - port: 4000
      targetPort: 4000
```

#### Step 3: Background Worker Deployment
Workers do not expose HTTP endpoints and should terminate gracefully on SIGTERM:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-qa-worker
  namespace: ai-qa-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-qa-worker
  template:
    metadata:
      labels:
        app: ai-qa-worker
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: your-registry.io/ai-qa/worker:v1.0.0
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          envFrom:
            - secretRef:
                name: ai-qa-secrets
```

---

## 5. Reverse Proxy & Security Hardening (Nginx Configuration)

Deploy Nginx or Traefik in front of the API and Web services to enforce SSL/TLS, HTTP/2, and security headers:

```nginx
# Rate Limiting Zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=50r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 443 ssl http2;
    server_name qa-platform.yourcompany.com;

    # SSL TLS 1.3 Best Practices
    ssl_certificate /etc/letsencrypt/live/qa-platform.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qa-platform.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Web Application
    location / {
        proxy_pass http://ai-qa-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # API Endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://ai-qa-api:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Real-Time SSE Stream (Disable proxy buffering)
    location /api/v1/notifications/stream {
        proxy_pass http://ai-qa-api:4000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding off;
    }

    # Strict Rate Limit on Authentication Endpoints
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://ai-qa-api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 6. Post-Deployment Verification & Smoke Tests

Execute the following commands immediately following any production release:

1. **Verify Liveness and Readiness:**
   ```bash
   curl -I https://qa-platform.yourcompany.com/api/v1/health/live
   # HTTP/1.1 200 OK

   curl https://qa-platform.yourcompany.com/api/v1/health/ready
   # {"status":"ready","database":"connected","redis":"connected"}
   ```

2. **Verify Prometheus Metrics Output:**
   ```bash
   curl -s https://qa-platform.yourcompany.com/api/v1/metrics | grep process_resident_memory_bytes
   ```

3. **Verify Database Schema Completeness:**
   ```bash
   node --experimental-strip-types scripts/verify-backup.ts
   # ALL 21 CORE MODELS VERIFIED!
   ```

4. **Verify Frontend Route Delivery:**
   - Log into web interface at `https://qa-platform.yourcompany.com/login`.
   - Verify active project dashboard loads.
   - Navigate to `/notifications` to confirm SSE stream connection establishes.
