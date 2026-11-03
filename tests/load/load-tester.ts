/**
 * Automated Production Load & Performance Benchmark Harness
 *
 * Evaluates:
 * - Throughput (Requests Per Second)
 * - Latency Percentiles (p50, p90, p95, p99)
 * - Error Rates under concurrency
 * - Memory & Resource Stability
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../apps/api/dist/app.js';

interface BenchmarkResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  concurrency: number;
  durationSeconds: number;
  throughputRps: number;
  latencyMs: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  endpoints: Record<
    string,
    {
      calls: number;
      avgMs: number;
      p95Ms: number;
    }
  >;
  memory: {
    beforeMb: number;
    afterMb: number;
    deltaMb: number;
  };
}

const TEST_DURATION_SECONDS = 10;
const CONCURRENT_USERS = 20;

export async function runLoadTest(): Promise<BenchmarkResult> {
  console.log('==========================================================');
  console.log(' [LOAD TEST] Artificial Intelligence QA Platform Benchmark');
  console.log(` Target Concurrency: ${CONCURRENT_USERS} Virtual Users`);
  console.log(` Test Duration:      ${TEST_DURATION_SECONDS} seconds`);
  console.log('==========================================================\n');

  const app = createApp();
  const server = http.createServer(app);

  // Start internal server on ephemeral port
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const memoryBefore = Math.round(process.memoryUsage().rss / (1024 * 1024));
  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION_SECONDS * 1000;

  const latencies: number[] = [];
  const endpointMetrics: Record<string, number[]> = {
    '/health/live': [],
    '/health/ready': [],
    '/metrics': [],
    '/metrics/json': [],
    '/billing/plans': [],
  };

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  async function worker(workerId: number) {
    const endpoints = [
      '/health/live',
      '/health/ready',
      '/metrics',
      '/metrics/json',
      '/billing/plans',
    ];

    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const reqStart = Date.now();

      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        const duration = Date.now() - reqStart;

        latencies.push(duration);
        endpointMetrics[endpoint].push(duration);
        totalRequests++;

        if (response.status < 500) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch {
        failedRequests++;
        totalRequests++;
      }

      // Small sleep to simulate user think time
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  // Launch concurrent workers
  console.log(`[INFO] Spawning ${CONCURRENT_USERS} concurrent workers...`);
  const workers = Array.from({ length: CONCURRENT_USERS }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  // Stop server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const memoryAfter = Math.round(process.memoryUsage().rss / (1024 * 1024));
  const actualDurationSeconds = (Date.now() - startTime) / 1000;
  const throughputRps = Math.round(totalRequests / actualDurationSeconds);

  latencies.sort((a, b) => a - b);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  const endpointSummary: Record<string, { calls: number; avgMs: number; p95Ms: number }> = {};
  for (const [ep, list] of Object.entries(endpointMetrics)) {
    list.sort((a, b) => a - b);
    endpointSummary[ep] = {
      calls: list.length,
      avgMs: list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0,
      p95Ms: list[Math.floor(list.length * 0.95)] || 0,
    };
  }

  const result: BenchmarkResult = {
    totalRequests,
    successfulRequests,
    failedRequests,
    concurrency: CONCURRENT_USERS,
    durationSeconds: Number(actualDurationSeconds.toFixed(2)),
    throughputRps,
    latencyMs: { min, max, avg, p50, p90, p95, p99 },
    endpoints: endpointSummary,
    memory: {
      beforeMb: memoryBefore,
      afterMb: memoryAfter,
      deltaMb: memoryAfter - memoryBefore,
    },
  };

  console.log('==========================================================');
  console.log(' [RESULTS] Load Test Performance Summary');
  console.log('==========================================================');
  console.log(` Total Requests:     ${totalRequests}`);
  console.log(` Successful (2xx):   ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
  console.log(` Failed Requests:    ${failedRequests}`);
  console.log(` Throughput:         ${throughputRps} req/sec`);
  console.log(` Latency Average:    ${avg} ms`);
  console.log(` Latency p50:        ${p50} ms`);
  console.log(` Latency p95:        ${p95} ms`);
  console.log(` Latency p99:        ${p99} ms`);
  console.log(` Memory Footprint:   ${memoryAfter} MB (Δ ${memoryAfter - memoryBefore} MB)`);
  console.log('----------------------------------------------------------');
  console.log(' Endpoint Breakdown:');
  for (const [ep, stats] of Object.entries(endpointSummary)) {
    console.log(`   ${ep.padEnd(20)}: ${String(stats.calls).padStart(5)} calls | avg: ${String(stats.avgMs).padStart(3)}ms | p95: ${String(stats.p95Ms).padStart(3)}ms`);
  }
  console.log('==========================================================\n');

  // Save report
  const outputDir = path.resolve(process.cwd(), 'tests/load');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outputDir, 'load-test-report.json'), JSON.stringify(result, null, 2));

  return result;
}

if (process.argv[1]?.endsWith('load-tester.ts') || process.argv[1]?.endsWith('load-tester.js')) {
  runLoadTest().catch((err) => {
    console.error('[LOAD:ERROR]', err);
    process.exit(1);
  });
}
