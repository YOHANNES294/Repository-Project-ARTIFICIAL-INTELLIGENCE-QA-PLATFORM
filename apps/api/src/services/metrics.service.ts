import { prisma } from '../prisma.js';
import { redis } from '../redis.js';

interface RequestMetric {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

class MetricsService {
  private requestCount = 0;
  private errorCount = 0;
  private sseConnections = 0;
  private recentRequests: RequestMetric[] = [];
  private readonly maxRecent = 1000;

  // Track an HTTP request
  public recordRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.requestCount++;
    if (statusCode >= 400) {
      this.errorCount++;
    }

    this.recentRequests.push({
      method,
      route,
      statusCode,
      durationMs,
      timestamp: Date.now(),
    });

    if (this.recentRequests.length > this.maxRecent) {
      this.recentRequests.shift();
    }
  }

  public recordSseConnection(delta: number): void {
    this.sseConnections = Math.max(0, this.sseConnections + delta);
  }

  // Get JSON summary of telemetry
  public async getMetricsJson() {
    const mem = process.memoryUsage();
    let dbConnected = false;
    let redisConnected = false;

    try {
      if (prisma && typeof (prisma as any).$queryRaw === 'function') {
        await prisma.$queryRaw`SELECT 1`;
        dbConnected = true;
      }
    } catch {
      dbConnected = false;
    }

    try {
      if (redis && redis.status === 'ready') {
        redisConnected = true;
      }
    } catch {
      redisConnected = false;
    }

    const durations = this.recentRequests.map((r) => r.durationMs).sort((a, b) => a - b);
    const p50 = durations.length ? durations[Math.floor(durations.length * 0.5)] : 0;
    const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : 0;
    const p99 = durations.length ? durations[Math.floor(durations.length * 0.99)] : 0;
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: this.requestCount > 0 ? Number((this.errorCount / this.requestCount).toFixed(4)) : 0,
        latencyMs: {
          avg,
          p50,
          p95,
          p99,
        },
      },
      connections: {
        activeSse: this.sseConnections,
        database: dbConnected ? 'connected' : 'disconnected',
        redis: redisConnected ? 'connected' : 'disconnected',
      },
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      },
    };
  }

  // Generate standard Prometheus exposition format
  public async getPrometheusMetrics(): Promise<string> {
    const json = await this.getMetricsJson();
    const mem = process.memoryUsage();

    const lines: string[] = [
      '# HELP process_uptime_seconds The process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${json.uptimeSeconds}`,
      '',
      '# HELP process_resident_memory_bytes Resident memory size in bytes',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${mem.rss}`,
      '',
      '# HELP process_heap_bytes Process heap bytes used',
      '# TYPE process_heap_bytes gauge',
      `process_heap_bytes ${mem.heapUsed}`,
      '',
      '# HELP http_requests_total Total number of HTTP requests processed',
      '# TYPE http_requests_total counter',
      `http_requests_total ${json.requests.total}`,
      '',
      '# HELP http_request_errors_total Total number of HTTP requests that resulted in 4xx/5xx errors',
      '# TYPE http_request_errors_total counter',
      `http_request_errors_total ${json.requests.errors}`,
      '',
      '# HELP http_request_duration_ms HTTP request latency summary in milliseconds',
      '# TYPE http_request_duration_ms summary',
      `http_request_duration_ms{quantile="0.5"} ${json.requests.latencyMs.p50}`,
      `http_request_duration_ms{quantile="0.95"} ${json.requests.latencyMs.p95}`,
      `http_request_duration_ms{quantile="0.99"} ${json.requests.latencyMs.p99}`,
      `http_request_duration_ms_avg ${json.requests.latencyMs.avg}`,
      '',
      '# HELP sse_connections_active Number of active Server-Sent Events subscribers',
      '# TYPE sse_connections_active gauge',
      `sse_connections_active ${json.connections.activeSse}`,
      '',
      '# HELP database_status Database connection status (1 = connected, 0 = disconnected)',
      '# TYPE database_status gauge',
      `database_status ${json.connections.database === 'connected' ? 1 : 0}`,
      '',
      '# HELP redis_status Redis connection status (1 = connected, 0 = disconnected)',
      '# TYPE redis_status gauge',
      `redis_status ${json.connections.redis === 'connected' ? 1 : 0}`,
    ];

    return lines.join('\n') + '\n';
  }
}

export const metricsService = new MetricsService();
