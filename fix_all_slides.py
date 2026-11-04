import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

PPTX_FILENAME = "AI_QA_Platform_Presentation.pptx"

def create_deck(filename=PPTX_FILENAME):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    c_dark_bg = RGBColor(15, 23, 42)      # Slate 900
    c_card_bg = RGBColor(30, 41, 59)      # Slate 800
    c_white = RGBColor(255, 255, 255)
    c_accent_sky = RGBColor(56, 189, 248) # Sky 400
    c_emerald = RGBColor(52, 211, 153)    # Emerald 400
    c_muted = RGBColor(148, 163, 184)     # Slate 400
    c_border = RGBColor(51, 65, 85)       # Slate 700

    def add_slide_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = c_dark_bg
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="AI QA PLATFORM"):
        # Category
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = c_accent_sky

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = c_white

    # ------------------ SLIDE 1: TITLE SLIDE ------------------
    slide1 = prs.slides.add_slide(blank_layout)
    add_slide_bg(slide1)

    box = slide1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.333), Inches(4.0))
    tf = box.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "ENTERPRISE SOFTWARE QUALITY SUITE"
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = c_accent_sky
    p0.space_after = Pt(12)

    p1 = tf.add_paragraph()
    p1.text = "Artificial Intelligence QA Platform"
    p1.font.size = Pt(40)
    p1.font.bold = True
    p1.font.color.rgb = c_white
    p1.space_after = Pt(14)

    p2 = tf.add_paragraph()
    p2.text = "Unified Test Authoring, Execution Workbenches, Defect Tracking & AI Automation"
    p2.font.size = Pt(18)
    p2.font.color.rgb = c_muted
    p2.space_after = Pt(30)

    p3 = tf.add_paragraph()
    p3.text = "Version 1.0.0 Production Release  |  Architecture & Workflow Master Guide"
    p3.font.size = Pt(12)
    p3.font.color.rgb = c_emerald

    # ------------------ SLIDE 2: THE PROBLEM & SOLUTION ------------------
    slide2 = prs.slides.add_slide(blank_layout)
    add_slide_bg(slide2)
    add_header(slide2, "The Core Problem & The Platform Solution")

    # Left card: The Problem
    card_left = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.7), Inches(5.6), Inches(5.2))
    card_left.fill.solid()
    card_left.fill.fore_color.rgb = c_card_bg
    card_left.line.color.rgb = RGBColor(225, 29, 72)
    card_left.line.width = Pt(1.5)

    tf_l = card_left.text_frame
    tf_l.word_wrap = True
    tf_l.margin_left = Inches(0.4)
    tf_l.margin_top = Inches(0.4)
    p_l0 = tf_l.paragraphs[0]
    p_l0.text = "The Legacy QA Problem"
    p_l0.font.size = Pt(18)
    p_l0.font.bold = True
    p_l0.font.color.rgb = RGBColor(251, 113, 133)
    p_l0.space_after = Pt(14)

    problems = [
        "Fragmented Tooling: Tests in sheets, runs in TestRail, bugs in Jira.",
        "Slow Authoring: Repetitive manual writing of steps and preconditions.",
        "Disconnected Evidence: Developers receive bug tickets without exact test steps.",
        "Blind Releases: Leadership lacks real-time pass rates & flakiness metrics."
    ]
    for p in problems:
        p_item = tf_l.add_paragraph()
        p_item.text = "x  " + p
        p_item.font.size = Pt(12)
        p_item.font.color.rgb = c_white
        p_item.space_after = Pt(10)

    # Right card: The Solution
    card_right = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.9), Inches(1.7), Inches(5.6), Inches(5.2))
    card_right.fill.solid()
    card_right.fill.fore_color.rgb = c_card_bg
    card_right.line.color.rgb = c_emerald
    card_right.line.width = Pt(1.5)

    tf_r = card_right.text_frame
    tf_r.word_wrap = True
    tf_r.margin_left = Inches(0.4)
    tf_r.margin_top = Inches(0.4)
    p_r0 = tf_r.paragraphs[0]
    p_r0.text = "The AI QA Platform Solution"
    p_r0.font.size = Pt(18)
    p_r0.font.bold = True
    p_r0.font.color.rgb = c_emerald
    p_r0.space_after = Pt(14)

    solutions = [
        "Single Pane of Glass: Repository, plans, runs, and defects in one place.",
        "AI Test Generation: Gemini generates positive, negative & edge cases.",
        "Traceable Workbenches: 1-click defect creation directly links failing steps.",
        "Real-Time Quality Gates: Automatic pass rate thresholds block bad builds."
    ]
    for s in solutions:
        p_item = tf_r.add_paragraph()
        p_item.text = "[v]  " + s
        p_item.font.size = Pt(12)
        p_item.font.color.rgb = c_white
        p_item.space_after = Pt(10)

    # ------------------ SLIDE 3: 6-STEP WORKFLOW ------------------
    slide3 = prs.slides.add_slide(blank_layout)
    add_slide_bg(slide3)
    add_header(slide3, "The Complete 6-Phase User Workflow")

    steps = [
        ("1. Setup", "Create Project & Target Environments (Dev, Staging, Prod)."),
        ("2. Author", "Build hierarchical Suites and write versioned Test Cases (MI-1 v1)."),
        ("3. Plan", "Group test cases into a structured Test Plan & Milestones."),
        ("4. Execute", "Start Test Run (MI-TR-1). Verify steps in real-time (Pass/Fail)."),
        ("5. Triage", "Log defect (MI-BUG-1) directly from failed step. Retest Attempt #2."),
        ("6. Release", "100% completion & pass rate. Quality gates clear for production!")
    ]

    for idx, (stitle, sdesc) in enumerate(steps):
        row = idx // 3
        col = idx % 3
        x = Inches(0.8 + col * 4.0)
        y = Inches(1.8 + row * 2.6)

        c = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.7), Inches(2.2))
        c.fill.solid()
        c.fill.fore_color.rgb = c_card_bg
        c.line.color.rgb = c_accent_sky
        c.line.width = Pt(1)

        ctf = c.text_frame
        ctf.word_wrap = True
        ctf.margin_top = Inches(0.2)
        ctf.margin_left = Inches(0.25)

        cp0 = ctf.paragraphs[0]
        cp0.text = stitle
        cp0.font.size = Pt(16)
        cp0.font.bold = True
        cp0.font.color.rgb = c_emerald
        cp0.space_after = Pt(8)

        cp1 = ctf.add_paragraph()
        cp1.text = sdesc
        cp1.font.size = Pt(11)
        cp1.font.color.rgb = c_muted

    # ------------------ SLIDE 4: SYSTEM ARCHITECTURE ------------------
    slide4 = prs.slides.add_slide(blank_layout)
    add_slide_bg(slide4)
    add_header(slide4, "System Architecture & Monorepo Modules")

    layers = [
        ("Web Frontend", "Next.js 16 + React 19 + Tailwind", "Responsive dark-mode UI, execution runner workbenches, and real-time dashboard analytics."),
        ("API Gateway", "Express.js + TypeScript + Zod", "Secure REST endpoints, multi-tenant RBAC, Argon2id auth, and audit logging."),
        ("Database Layer", "PostgreSQL 16 + Prisma ORM", "Strict row-level tenancy, relational integrity, cascade indexes, and ACID transactions."),
        ("Async Worker", "BullMQ + Redis Task Queue", "Background AI test generation, heavy report PDF compilation, and webhooks."),
        ("AI Engine", "Gemini 2.5 / LLM Workflow", "User-story-to-test converter, root-cause diagnostics, and duplicate defect detection.")
    ]

    for i, (l_name, l_tech, l_desc) in enumerate(layers):
        y = Inches(1.6 + i * 1.05)
        bar = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), y, Inches(11.7), Inches(0.9))
        bar.fill.solid()
        bar.fill.fore_color.rgb = c_card_bg
        bar.line.color.rgb = c_border

        btf = bar.text_frame
        btf.word_wrap = True
        btf.margin_left = Inches(0.3)
        btf.margin_top = Inches(0.15)

        bp = btf.paragraphs[0]
        bp.text = f"{l_name} ({l_tech}) — "
        bp.font.size = Pt(12)
        bp.font.bold = True
        bp.font.color.rgb = c_accent_sky

        run = bp.add_run()
        run.text = l_desc
        run.font.size = Pt(11)
        run.font.bold = False
        run.font.color.rgb = c_white

    prs.save(filename)
    print(f"SUCCESS: PowerPoint deck generated at: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else PPTX_FILENAME
    create_deck(out_file)
