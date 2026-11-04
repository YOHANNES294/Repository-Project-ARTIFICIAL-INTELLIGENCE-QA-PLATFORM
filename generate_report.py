import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

PDF_FILENAME = "AI_QA_Platform_Complete_Report.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Skip header/footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header
        self.drawString(54, 750, "AI QA PLATFORM — COMPLETE ARCHITECTURE, REQUIREMENTS & FLOW")
        self.setFont("Helvetica", 8)
        self.drawRightString(558, 750, "CONFIDENTIAL & PROPRIETARY")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 742, 558, 742)

        # Running Footer
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica", 8)
        self.drawString(54, 32, "Enterprise QA & Test Management SaaS Platform")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


def build_pdf(filename=PDF_FILENAME):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=12
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=24
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#0C4A6E")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 40))
    story.append(Paragraph("AI QA PLATFORM", title_style))
    story.append(Paragraph("Enterprise Quality Assurance & Test Management SaaS Platform<br/>Comprehensive Architecture, Business Requirements & Workflow Blueprint", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor("#0284C7"), spaceAfter=25))

    meta_table_data = [
        [Paragraph("Project Version:", table_cell_bold), Paragraph("v1.0.0 Production Release", table_cell_style)],
        [Paragraph("Target Audience:", table_cell_bold), Paragraph("Engineering Leads, QA Leads, Testers, Developers, Product Managers", table_cell_style)],
        [Paragraph("Repository:", table_cell_bold), Paragraph("Repository-Project-ARTIFICIAL-INTELLIGENCE-QA-PLATFORM", table_cell_style)],
        [Paragraph("Core Architecture:", table_cell_bold), Paragraph("Next.js 16 + Express API + PostgreSQL 16 + BullMQ Redis + AI Engine", table_cell_style)],
        [Paragraph("Authoring Date:", table_cell_bold), Paragraph("November 2026", table_cell_style)],
    ]
    meta_table = Table(meta_table_data, colWidths=[130, 374])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 35))

    # Executive Box
    exec_data = [[
        Paragraph(
            "<b>EXECUTIVE SUMMARY:</b><br/>"
            "This official master documentation outlines the total software engineering vision, core architecture, "
            "role governance, and end-to-end execution lifecycle of the Artificial Intelligence QA Platform. "
            "Designed to unify fragmented legacy tools (TestRail, Zephyr, Jira Xray, spreadsheets), the platform "
            "combines structured hierarchical test case authoring, live multi-step execution workbenches, "
            "traceable defect management, and Gemini-powered AI test generation and root-cause diagnostics into "
            "one single-pane-of-glass SaaS ecosystem.",
            callout_style
        )
    ]]
    exec_table = Table(exec_data, colWidths=[504])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#E0F2FE")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#0284C7")),
        ('PADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(exec_table)

    story.append(PageBreak())

    # ==================== SECTION 1: THE BIG PICTURE ====================
    story.append(Paragraph("1. The Big Picture: Why This Platform Exists", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph(
        "Software testing across modern enterprises is severely hindered by tooling fragmentation. "
        "Quality engineering teams frequently waste upwards of 35% of their working hours maintaining test steps "
        "in spreadsheets, re-entering results in legacy tracking tools, copying stack traces into bug trackers, "
        "and manually digging through CI/CD logs to figure out why an automated build failed.",
        body_style
    ))
    story.append(Paragraph(
        "The AI QA Platform directly eliminates this friction by unifying all phases of the quality lifecycle:",
        body_style
    ))

    story.append(Paragraph("<b>1. Unified Single Pane of Glass:</b> Test cases, suites, milestones, execution runs, defect lifecycles, and executive coverage analytics live under a single unified project roof.", bullet_style))
    story.append(Paragraph("<b>2. AI Productivity Multiplication:</b> Features native Gemini LLM integrations that transform natural-language user stories into rigorous test cases, detect duplicate bug reports, and analyze execution failures.", bullet_style))
    story.append(Paragraph("<b>3. True End-to-End Traceability:</b> A defect is never an isolated ticket; it is immutably linked to the exact test case version, run attempt, step observation, and release milestone where it occurred.", bullet_style))
    story.append(Paragraph("<b>4. Enterprise Multi-Tenancy & Governance:</b> Full data isolation by Organization ID and Project ID, enforced with Argon2id session authentication and strict 6-tier Role-Based Access Control (RBAC).", bullet_style))

    story.append(Spacer(1, 10))

    # ==================== SECTION 2: END-TO-END WORKFLOW ====================
    story.append(Paragraph("2. Complete End-to-End Platform Flow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    flow_data = [
        [Paragraph("Phase", table_header_style), Paragraph("Stage & Action", table_header_style), Paragraph("Key Artifacts / Outcome", table_header_style)],
        [
            Paragraph("Phase 1", table_cell_bold),
            Paragraph("<b>Organization & Project Setup:</b><br/>Admin logs in, defines organization, creates project (e.g. <i>Micky Mobile</i>, Key: <code>MI</code>), and adds environments (Dev, QA, Staging, Prod).", table_cell_style),
            Paragraph("Organization ID, Project Key, Target Environments, Member Roles", table_cell_style)
        ],
        [
            Paragraph("Phase 2", table_cell_bold),
            Paragraph("<b>Test Authoring:</b><br/>QA Lead creates hierarchical suites (e.g. <i>Authentication</i>, <i>User Profile</i>). Writes test cases with preconditions and ordered steps (Action, Test Data, Expected Result).", table_cell_style),
            Paragraph("Immutable Test Case Versions (<code>MI-1 v1</code>, <code>MI-2 v1</code>), CSV import/export", table_cell_style)
        ],
        [
            Paragraph("Phase 3", table_cell_bold),
            Paragraph("<b>Planning & Scheduling:</b><br/>Define release Milestones (Sprint 1) with start/end target dates. Group suites into Test Plans and generate Test Runs (e.g. <code>MI-TR-1</code>).", table_cell_style),
            Paragraph("Milestone, Test Plan, Execution Run with assigned cases", table_cell_style)
        ],
        [
            Paragraph("Phase 4", table_cell_bold),
            Paragraph("<b>Live Execution:</b><br/>Tester opens Execution Workbench, starts run, and verifies each step in real time (Pass, Fail, Block, Skip), logging stopwatch duration and observed outcomes.", table_cell_style),
            Paragraph("Step-level execution results, pass percentage, duration tracking", table_cell_style)
        ],
        [
            Paragraph("Phase 5", table_cell_bold),
            Paragraph("<b>Defect Triage & Retesting:</b><br/>Failing steps trigger 1-click Defect Creation (<code>MI-BUG-1</code>). Developers fix code, mark <code>READY_FOR_RETEST</code>, and QA retests with Attempt #2.", table_cell_style),
            Paragraph("Defect tickets, 2-way links, multi-attempt history (Attempt #1 & #2)", table_cell_style)
        ],
        [
            Paragraph("Phase 6", table_cell_bold),
            Paragraph("<b>Release Sign-Off:</b><br/>All tests pass (100% completion). Executive dashboards verify quality gates (zero critical bugs). Milestone signed off for production deployment.", table_cell_style),
            Paragraph("Executive Quality Report, Quality Gate Pass, Production Release", table_cell_style)
        ],
    ]
    flow_table = Table(flow_data, colWidths=[65, 275, 164])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(flow_table)

    story.append(PageBreak())

    # ==================== SECTION 3: SYSTEM ARCHITECTURE ====================
    story.append(Paragraph("3. System Architecture & Monorepo Design", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph(
        "The platform is architected as an enterprise TypeScript monorepo managed with <b>pnpm workspaces</b>. "
        "Strict separation of concerns ensures horizontal scalability, high throughput, and seamless code sharing.",
        body_style
    ))

    arch_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Component", table_header_style), Paragraph("Responsibility & Key Features", table_header_style)],
        [
            Paragraph("Presentation", table_cell_bold),
            Paragraph("<code>apps/web</code><br/>Next.js 16 (React 19)", table_cell_style),
            Paragraph("Responsive SaaS portal, App Router navigation, TanStack Query cache, Tailwind CSS dark-mode design, execution workbenches.", table_cell_style)
        ],
        [
            Paragraph("API Gateway", table_cell_bold),
            Paragraph("<code>apps/api</code><br/>Express.js + TypeScript", table_cell_style),
            Paragraph("RESTful endpoints under <code>/api/v1</code>, Argon2id auth, multi-tenant middleware, Zod payload validation, audit logging.", table_cell_style)
        ],
        [
            Paragraph("Async Worker", table_cell_bold),
            Paragraph("<code>apps/worker</code><br/>BullMQ + Redis", table_cell_style),
            Paragraph("Background asynchronous queue for AI test generation, heavy report PDF compilation, and outgoing webhook event dispatching.", table_cell_style)
        ],
        [
            Paragraph("Database", table_cell_bold),
            Paragraph("<code>database/prisma</code><br/>PostgreSQL 16", table_cell_style),
            Paragraph("Relational schema with Prisma ORM, multi-tenant row scoping, cascade indexes, audit trail history tables, and ACID transactions.", table_cell_style)
        ],
        [
            Paragraph("Shared Code", table_cell_bold),
            Paragraph("<code>packages/*</code><br/>4 Internal Libraries", table_cell_style),
            Paragraph("<code>shared-types</code> (DTOs), <code>validation</code> (Zod schemas), <code>api-client</code> (HTTP SDK), and <code>ui</code> (Design system).", table_cell_style)
        ],
    ]
    arch_table = Table(arch_data, colWidths=[80, 140, 284])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(arch_table)

    story.append(Spacer(1, 14))

    # ==================== SECTION 4: USER ROLES & RBAC ====================
    story.append(Paragraph("4. Role-Based Access Control (RBAC) Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    rbac_data = [
        [Paragraph("Role", table_header_style), Paragraph("Scope", table_header_style), Paragraph("Key Permissions & Operational Duties", table_header_style)],
        [
            Paragraph("SUPERADMIN", table_cell_bold),
            Paragraph("Platform-wide", table_cell_style),
            Paragraph("Full global access across all tenants, organizations, subscriptions, billing adjustments, and system telemetry.", table_cell_style)
        ],
        [
            Paragraph("OWNER / ADMIN", table_cell_bold),
            Paragraph("Organization", table_cell_style),
            Paragraph("Manages organization profile, invites members, manages billing subscriptions, creates and archives projects.", table_cell_style)
        ],
        [
            Paragraph("QA LEAD", table_cell_bold),
            Paragraph("Project", table_cell_style),
            Paragraph("Configures environments, creates test suites, structures test plans, defines quality gates, approves milestones.", table_cell_style)
        ],
        [
            Paragraph("QA TESTER", table_cell_bold),
            Paragraph("Project", table_cell_style),
            Paragraph("Authors test cases, executes runs step-by-step, marks pass/fail, files defect tickets, performs retest verifications.", table_cell_style)
        ],
        [
            Paragraph("DEVELOPER", table_cell_bold),
            Paragraph("Project", table_cell_style),
            Paragraph("Inspects linked defects and reproduction steps, comments on bugs, marks issues as <code>FIXED</code> when resolved.", table_cell_style)
        ],
        [
            Paragraph("VIEWER", table_cell_bold),
            Paragraph("Project", table_cell_style),
            Paragraph("Read-only access for stakeholders, product owners, and executives to review coverage metrics and pass rates.", table_cell_style)
        ],
    ]
    rbac_table = Table(rbac_data, colWidths=[95, 85, 324])
    rbac_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(rbac_table)

    story.append(PageBreak())

    # ==================== SECTION 5: CORE MODULE SPECIFICATIONS ====================
    story.append(Paragraph("5. Detailed Module Specifications", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph("Module 1: Test Case Repository & Versioning", h2_style))
    story.append(Paragraph(
        "Test cases represent the foundational asset of the platform. Unlike flat spreadsheets, each case contains "
        "preconditions, execution time estimates, functional tags, priority (Critical, High, Medium, Low), and ordered steps. "
        "Whenever a test case is edited, the system increments its version (<code>v1</code> &rarr; <code>v2</code>) without overwriting "
        "past run executions, guaranteeing immutable historical auditability.",
        body_style
    ))

    story.append(Paragraph("Module 2: Execution Workbench & Multi-Attempt Retesting", h2_style))
    story.append(Paragraph(
        "The live execution runner enables testers to evaluate test steps with full precision. "
        "Testers mark each individual step as <b>Pass</b>, <b>Fail</b>, <b>Block</b>, or <b>Skip</b> and enter real observed text. "
        "When retesting a fixed bug, the workbench creates a new attempt (Attempt #2), keeping Attempt #1 preserved for metrics.",
        body_style
    ))

    story.append(Paragraph("Module 3: Traceable Defect Lifecycle Management", h2_style))
    story.append(Paragraph(
        "Defects feature a strict finite state machine: <code>NEW</code> &rarr; <code>IN_PROGRESS</code> &rarr; "
        "<code>READY_FOR_RETEST</code> &rarr; <code>VERIFIED</code> &rarr; <code>CLOSED</code>. "
        "Every defect captures reproduction steps, environment specifications, severity, developer assignee, and two-way links "
        "to the exact test case that surfaced it.",
        body_style
    ))

    story.append(Paragraph("Module 4: AI Intelligence Engine", h2_style))
    story.append(Paragraph(
        "The platform embeds Gemini LLM capabilities directly into the QA workflow: "
        "<br/>• <b>AI Test Generation:</b> Automatically creates comprehensive positive, negative, and edge test cases from user stories."
        "<br/>• <b>AI Root-Cause Diagnostics:</b> Analyzes execution failure logs to identify code regressions and suggested fixes."
        "<br/>• <b>Duplicate Defect Detection:</b> Uses semantic text similarity to alert testers before filing duplicate bug tickets.",
        body_style
    ))

    story.append(Paragraph("Module 5: Automation & CI/CD Ingestion", h2_style))
    story.append(Paragraph(
        "Built-in REST endpoints ingest test execution results from automated frameworks including <b>Playwright</b>, "
        "<b>Cypress</b>, <b>Newman (Postman)</b>, and <b>JUnit XML</b>. Automated results populate the same dashboards as manual runs.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # Sign-Off Verification Box
    signoff_data = [[
        Paragraph(
            "<b>PLATFORM VERIFICATION & PRODUCTION READINESS:</b><br/>"
            "• Monorepo Status: 100% TypeScript compile cleanly across all 7 packages (0 errors).<br/>"
            "• Test Suite: Monorepo-wide test suite passes 238/238 unit and integration tests.<br/>"
            "• Git Release: Tagged as <code>v1.0.0</code> and pushed to main branch.<br/>"
            "• Database: PostgreSQL 16 schema validated with Prisma migrations and multi-tenant security.",
            callout_style
        )
    ]]
    signoff_table = Table(signoff_data, colWidths=[504])
    signoff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#10B981")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(signoff_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: ReportLab generated {filename} successfully.")


if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else PDF_FILENAME
    build_pdf(out_file)
