import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const authLatency = new Trend('auth_latency');
const projectLatency = new Trend('project_latency');
const testCaseLatency = new Trend('test_case_latency');
const defectLatency = new Trend('defect_latency');
const analyticsLatency = new Trend('analytics_latency');
const billingLatency = new Trend('billing_latency');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up to 10 VUs
    { duration: '1m', target: 25 },  // Sustained load at 25 VUs
    { duration: '30s', target: 50 }, // Stress peak at 50 VUs
    { duration: '30s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    error_rate: ['rate<0.01'],                       // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export default function () {
  const testUser = {
    email: `loadtest_${__VU}@example.com`,
    password: 'Password123!@#',
  };

  let token = '';
  let projectId = '';

  // 1. Health Probe
  group('01_Health_Probes', () => {
    const res = http.get(`${BASE_URL}/health/live`);
    check(res, {
      'health live returns 200': (r) => r.status === 200,
    });
  });

  // 2. Authentication Workflow
  group('02_Authentication', () => {
    const loginPayload = JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    authLatency.add(Date.now() - start);

    const isSuccess = check(res, {
      'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    errorRate.add(!isSuccess);

    if (res.status === 200 && res.json('data.accessToken')) {
      token = res.json('data.accessToken');
    }
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Project Management Workflow
  group('03_Project_Management', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/projects`, { headers: authHeaders });
    projectLatency.add(Date.now() - start);

    check(res, {
      'projects query handled': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    });

    const body = res.json();
    if (body && body.data && body.data.length > 0) {
      projectId = body.data[0].id;
    }
  });

  // 4. Test Case Listing & Search
  if (projectId) {
    group('04_Test_Cases', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/projects/${projectId}/test-cases?page=1&limit=20`, {
        headers: authHeaders,
      });
      testCaseLatency.add(Date.now() - start);

      check(res, {
        'test cases query handled': (r) => r.status === 200 || r.status === 401,
      });
    });

    // 5. Defect Management & Tracking
    group('05_Defects', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/projects/${projectId}/defects?page=1&limit=20`, {
        headers: authHeaders,
      });
      defectLatency.add(Date.now() - start);

      check(res, {
        'defects query handled': (r) => r.status === 200 || r.status === 401,
      });
    });

    // 6. Quality Analytics & Quality Gates
    group('06_Analytics', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/projects/${projectId}/analytics/executive`, {
        headers: authHeaders,
      });
      analyticsLatency.add(Date.now() - start);

      check(res, {
        'analytics query handled': (r) => r.status === 200 || r.status === 401,
      });
    });
  }

  // 7. Billing Plans & Entitlements
  group('07_Billing_Entitlements', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/billing/plans`, { headers: authHeaders });
    billingLatency.add(Date.now() - start);

    check(res, {
      'plans catalog handled': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(1);
}
