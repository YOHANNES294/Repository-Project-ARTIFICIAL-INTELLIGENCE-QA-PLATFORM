const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '../docs/AI_QA_PLATFORM_MASTER_DOCUMENTATION.pdf');
const doc = new PDFDocument({
  margin: 50,
  size: 'A4',
  bufferPages: true,
  info: {
    Title: 'AI QA Platform - Complete Architecture, Flow & Requirements Guide',
    Author: 'AI QA Platform Engineering Team',
    Subject: 'System Architecture, Business Requirements, and User Workflow',
    Keywords: 'QA, Test Management, AI, Multi-Tenant, Architecture, Guide'
  }
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Styling helpers
const primaryColor = '#0f172a'; // Slate 900
const accentColor = '#0284c7';  // Sky 600
const emeraldColor = '#059669'; // Emerald 600
const textColor = '#334155';    // Slate 700
const lightBg = '#f8fafc';      // Slate 50
const borderColor = '#cbd5e1';  // Slate 300

function addHeader(title, subtitle) {
  doc.rect(50, 45, 495, 80).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(title, 65, 60);
  doc.fillColor('#38bdf8').fontSize(11).font('Helvetica').text(subtitle, 65, 90);
  doc.y = 145;
}

function addSectionTitle(title, tag) {
  doc.moveDown(0.8);
  const y = doc.y;
  if (y > 680) {
    doc.addPage();
  }
  doc.rect(50, doc.y, 495, 24).fill('#f1f5f9');
  doc.fillColor('#0284c7').fontSize(13).font('Helvetica-Bold').text(title, 60, doc.y + 6);
  if (tag) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(tag.toUpperCase(), 460, doc.y - 12);
  }
  doc.moveDown(0.8);
}

function addSubSection(title) {
  if (doc.y > 700) doc.addPage();
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

function addParagraph(text) {
  if (doc.y > 720) doc.addPage();
  doc.fillColor(textColor).fontSize(10).font('Helvetica').lineGap(3).text(text);
  doc.moveDown(0.5);
}

function addBullet(title, description) {
  if (doc.y > 720) doc.addPage();
  doc.fillColor('#0284c7').fontSize(10).font('Helvetica-Bold').text(`•  ${title}: `, { continued: true });
  doc.fillColor(textColor).font('Helvetica').text(description);
  doc.moveDown(0.2);
}

function addCalloutBox(title, body, color = '#e0f2fe', strokeColor = '#0284c7') {
  if (doc.y > 680) doc.addPage();
  const startY = doc.y;
  doc.rect(50, startY, 495, 55).fillAndStroke(color, strokeColor);
  doc.fillColor(strokeColor).fontSize(10).font('Helvetica-Bold').text(title, 62, startY + 8);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(body, 62, startY + 24, { width: 470 });
  doc.y = startY + 65;
}

// ==================== COVER / HEADER ====================
addHeader('AI QA PLATFORM', 'Enterprise Quality Assurance & Test Management SaaS — Master Blueprint');

addCalloutBox(
  'EXECUTIVE OVERVIEW',
  'This master document provides a comprehensive end-to-end breakdown of the platform purpose, business requirements, system architecture, core modules, and the step-by-step user journey from initial setup to production release sign-off.'
);

// ==================== SECTION 1: THE BIG IDEA ====================
addSectionTitle('1. The Core Idea & Purpose', 'Context');
addParagraph(
  'Modern software teams struggle with fragmented quality assurance tools: test cases live in spreadsheets, execution logs are buried in TestRail, bugs are scattered across Jira, and automated results disappear inside CI/CD pipelines. This results in slow release cycles, undetected regressions, and high engineering friction.'
);
addParagraph(
  'The Artificial Intelligence QA Platform solves this by providing a unified, single-pane-of-glass test management solution designed for modern web, mobile, and API testing. It pairs traditional structured QA governance with cutting-edge AI assistance to streamline the entire software testing lifecycle.'
);

addSubSection('Key Value Propositions');
addBullet('Unified QA Workspace', 'Eliminates tool sprawl by bringing test repository, plans, runs, defect tracking, and analytics into one connected ecosystem.');
addBullet('AI-Accelerated Productivity', 'Automates repetitive manual testing work: generates test cases from user stories, diagnoses failure root causes, and detects duplicate bug reports.');
addBullet('Enterprise Governance', 'Multi-tenant organization isolation, strict Role-Based Access Control (RBAC), immutable audit logging, and quality gates.');
addBullet('End-to-End Traceability', 'Links every bug directly to the exact test case step, test run, browser session, and release milestone where it occurred.');

// ==================== SECTION 2: SYSTEM ARCHITECTURE ====================
doc.addPage();
addSectionTitle('2. System Architecture & Tech Stack', 'Architecture');
addParagraph('The platform is built as a high-performance, modular monorepo leveraging enterprise best practices:');

addSubSection('Technology Stack');
addBullet('Frontend Web App', 'Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, TanStack React Query.');
addBullet('Backend API Service', 'Express.js, TypeScript, Prisma ORM, Argon2id encryption, Zod payload validation.');
addBullet('Database Layer', 'PostgreSQL 16 relational database with relational integrity, foreign keys, and cascading indexes.');
addBullet('Async Task Engine', 'Redis & BullMQ worker queue for background AI generations, report exports, and webhook delivery.');
addBullet('Shared Packages', '@ai-qa/shared-types, @ai-qa/validation, @ai-qa/api-client, and @ai-qa/ui.');

addSubSection('Multi-Tenancy & Security Isolation');
addParagraph(
  'Every resource (Projects, Test Cases, Test Runs, Defects, API Keys) is strictly scoped to an Organization ID and Project ID. The backend enforces authentication middleware (JWT / Session Cookie) and authorization checks on every single route to guarantee strict cross-tenant isolation.'
);

// ==================== SECTION 3: CORE PLATFORM MODULES ====================
doc.addPage();
addSectionTitle('3. Core Platform Modules', 'Modules');

addSubSection('Module 1: Multi-Tenant Auth & User Management');
addParagraph('Supports multi-tier organizations with 6 granular user roles:');
addBullet('SUPERADMIN', 'Platform-wide administrator with full system, tenant, and billing control.');
addBullet('OWNER / ADMIN', 'Full control over organization settings, projects, billing subscriptions, and team invites.');
addBullet('QA LEAD', 'Can create projects, define test plans, approve AI test cases, and sign off on release milestones.');
addBullet('QA TESTER', 'Authors test cases, executes test runs, logs defect tickets, and verifies bug fixes.');
addBullet('DEVELOPER', 'Views linked test cases, updates defect statuses, comments on bugs, and investigates reproduction steps.');
addBullet('VIEWER', 'Read-only stakeholder access to executive dashboards, pass rates, and coverage reports.');

addSubSection('Module 2: Project Management');
addParagraph(
  'Projects represent distinct software products (e.g. "Micky Mobile", "Web Portal", "Payment Service"). Each project has a unique key prefix (e.g. MI), environments (Dev, QA, Staging, Prod), team assignments, and target quality objectives.'
);

addSubSection('Module 3: Test Case Repository');
addParagraph(
  'Structured hierarchical storage for all manual and automated tests. Features include:'
);
addBullet('Hierarchical Test Suites', 'Organize test cases into nested folders by functional domain (e.g., Auth, Cart, Checkout, Settings).');
addBullet('Step-by-Step Editor', 'Each case contains preconditions, priority, execution time, and ordered steps (Action, Test Data, Expected Result).');
addBullet('Immutable Version History', 'Every modification increments the version (v1 -> v2) to preserve exact historical run integrity.');
addBullet('CSV Bulk Import/Export', 'Quickly import thousands of existing test cases from legacy spreadsheets or other tools.');

// ==================== SECTION 4: TEST RUNS & DEFECTS ====================
doc.addPage();
addSectionTitle('4. Execution Engine & Defect Lifecycle', 'Execution');

addSubSection('Module 4: Milestones & Test Plans');
addParagraph(
  'Test Plans group test cases together for targeted testing cycles (e.g., "Sprint 24 Regression Plan", "iOS 18 Compatibility Plan"). Milestones define delivery release dates and aggregate pass rates across all planned executions.'
);

addSubSection('Module 5: Test Execution Workbench');
addParagraph(
  'The live execution cockpit for QA testers. Features real-time multi-step verification:'
);
addBullet('Step-Level Verification', 'Testers mark each individual step as Passed, Failed, Blocked, or Skipped.');
addBullet('Actual Observations & Timers', 'Record real observed outcome text, failure reasons, and stopwatch time taken.');
addBullet('Multi-Attempt History', 'Supports retests with version-tracked execution attempts.');
addBullet('1-Click Defect Generation', 'If a step fails, a pre-filled bug report is generated with steps to reproduce already attached.');

addSubSection('Module 6: Defect & Bug Tracking Lifecycle');
addParagraph('Comprehensive bug tracking designed specifically for QA-to-Developer handoffs:');
addBullet('Standard Lifecycle', 'NEW -> IN_PROGRESS -> READY_FOR_RETEST -> VERIFIED -> CLOSED (or REJECTED/DUPLICATE).');
addBullet('Impact Triage', 'Severity (Critical, High, Medium, Low) and Priority (Urgent, High, Medium, Low).');
addBullet('Traceability Linkage', 'Direct 2-way links between defects, test cases, and test execution runs.');
addBullet('Collaboration', 'Threaded comments and complete audit trail history of every status transition.');

// ==================== SECTION 5: AI & AUTOMATION ====================
doc.addPage();
addSectionTitle('5. AI Intelligence Engine & CI/CD', 'Intelligence');

addSubSection('Module 7: AI Intelligence Capabilities');
addBullet('AI Test Case Generator', 'Converts unstructured user stories or PRDs into fully structured test cases with preconditions and steps.');
addBullet('AI Root-Cause Diagnostics', 'Analyzes failed test logs and stack traces to identify code regressions and suggested fixes.');
addBullet('Duplicate Defect Detection', 'Scans incoming defect reports against existing open bugs using semantic text similarity.');
addBullet('Executive QA Risk Reports', 'Generates high-level release readiness summaries for engineering managers and stakeholders.');

addSubSection('Module 8: CI/CD Automation & Integrations');
addBullet('Automated Test Ingestion', 'Native reporters for Playwright, Cypress, Newman/Postman, and JUnit XML.');
addBullet('Scoped API Tokens', 'Generate project-specific or org-wide API tokens for continuous integration pipelines.');
addBullet('Outgoing Webhooks', 'Real-time webhook notifications for Slack, Jira, GitHub, or custom microservices on test completions.');

addSubSection('Module 9: Executive Analytics & Quality Gates');
addParagraph(
  'Live charts showing overall pass percentage, test coverage by suite, defect density trends, flakiness index, and customizable quality gates that can block CI deployments if pass rates fall below 95%.'
);

// ==================== SECTION 6: END-TO-END FLOW ====================
doc.addPage();
addSectionTitle('6. End-to-End User Flow (Step-by-Step)', 'User Journey');

addSubSection('Phase 1: Project Setup & Team Onboarding');
addParagraph('1. Sign in as Admin or QA Lead (e.g. sarah.lead@acme.staging.local).');
addParagraph('2. Create or select an active Project (e.g. "Micky Mobile" with key "MI").');
addParagraph('3. Define test environments (e.g., Staging, Production).');

addSubSection('Phase 2: Authoring Test Repository');
addParagraph('4. Navigate to Test Cases -> Create Suite ("User Profile").');
addParagraph('5. Click "New Test Case" -> Enter Title, Preconditions, and Step-by-Step actions with Expected Results.');
addParagraph('6. Save the test case (system assigns key MI-1, v1).');

addSubSection('Phase 3: Launching Execution Run');
addParagraph('7. Navigate to Test Runs -> Click "Create Test Run".');
addParagraph('8. Provide run name ("Sprint 1 - Avatar Smoke Run") and select test case MI-1.');
addParagraph('9. Click "Create Test Run" -> Open the execution workbench.');

addSubSection('Phase 4: Executing Tests & Logging Defects');
addParagraph('10. Click "Start Test Run" to transition state to IN_PROGRESS.');
addParagraph('11. Click "Execute" on test case MI-1.');
addParagraph('12. Verify each step: mark Pass/Fail, enter observed outcomes.');
addParagraph('13. If a bug is discovered, click "Log Defect" to create ticket (e.g. MI-BUG-1) with linked evidence.');
addParagraph('14. Complete the test run when all cases are verified.');

addSubSection('Phase 5: Defect Retesting & Milestone Sign-Off');
addParagraph('15. Developers move defect from NEW to IN_PROGRESS, apply fix, and mark READY_FOR_RETEST.');
addParagraph('16. QA retests the test case, logs second attempt, and marks defect VERIFIED and CLOSED.');
addParagraph('17. QA Lead reviews the Milestone progress bar and signs off on the release with 100% confidence.');

// ==================== FOOTER & PAGE NUMBERING ====================
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(50, 792 - 40, 495, 0.5).fill('#cbd5e1');
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
    `AI QA Platform — Complete Master Documentation | Page ${i + 1} of ${range.count}`,
    50,
    792 - 32,
    { align: 'center', width: 495 }
  );
}

doc.end();

stream.on('finish', () => {
  console.log('SUCCESS: Master Documentation PDF generated at: ' + outputPath);
});
