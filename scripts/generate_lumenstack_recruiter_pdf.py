from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "LUMENSTACK EXPLAINATION.pdf"


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="Hero",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0b2540"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=22,
            textColor=colors.HexColor("#0f3d5e"),
            spaceBefore=8,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=15,
            textColor=colors.HexColor("#102a43"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            leftIndent=12,
            bulletIndent=0,
            textColor=colors.HexColor("#102a43"),
            spaceAfter=4,
        )
    )
    return styles


def para(text, style):
    return Paragraph(text.replace("\n", "<br/>"), style)


def bullets(items, style):
    return [Paragraph(item, style, bulletText="â€¢") for item in items]


def make_table(rows, col_widths):
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f3d5e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c5d9ea")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fbff")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fbff"), colors.HexColor("#eef5fb")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#f5f9fc"))
    canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#dbeafe"))
    canvas.circle(54, 742, 44, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#c7f9e5"))
    canvas.circle(548, 72, 56, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#0f3d5e"))
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(doc.leftMargin, 18, "LUMENSTACK EXPLAINATION")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(letter[0] - doc.rightMargin, 18, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def story():
    styles = build_styles()
    flow = []

    flow.extend(
        [
            Spacer(1, 18),
            para("LUMENSTACK EXPLAINATION", styles["Hero"]),
            para(
                "Full project explanation with a stronger recruiter Q&A appendix",
                styles["Body"],
            ),
            para("Recruiter Coverage Check", styles["Section"]),
            para(
                "I rebuilt this version so the interview section covers the most common recruiter questions more completely: what the project does, why it was built, architecture, stack, hardest challenge, AI role, security, testing, scalability, deployment, limitations, and future improvements.",
                styles["Body"],
            ),
            para("Quick answer: the common recruiter Q&A is covered in this version.", styles["Body"]),
            para("Best memory order", styles["Section"]),
            *bullets(
                [
                    "Input: repo URL or ZIP file.",
                    "Backend: Express routes handle analyze, chat, compare, export, and webhook flows.",
                    "Analyzer: scans files, finds modules, dependencies, platform signals, and hotspots.",
                    "AI layer: explains architecture and answers repo questions with fallback mode.",
                    "Frontend: premium recruiter-ready UI with diagrams, reports, and multi-page storytelling.",
                ],
                styles["BodyBullet"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("1 Minute Interview Version", styles["Section"]),
            *bullets(
                [
                    "LumenStack AI is a full-stack repository analysis product that accepts a public repo URL or ZIP upload and turns it into an architecture intelligence workspace.",
                    "The backend is built with Node.js and Express and handles source intake, analysis, chat, compare mode, exports, and webhook-based report generation.",
                    "The custom analyzer walks code files, groups modules, detects dependencies and platform signals, scores quality, and builds Mermaid diagrams.",
                    "The AI layer produces explanations and codebase Q&A, but the app also has fallback behavior if the OpenAI API is unavailable.",
                    "The frontend is designed like a polished SaaS product so recruiters can evaluate both engineering and product thinking quickly.",
                ],
                styles["BodyBullet"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("3 Minute Interview Version", styles["Section"]),
            *bullets(
                [
                    "First, the source service clones a repository or extracts a ZIP archive into a temporary runtime workspace.",
                    "Next, the analyzer ignores noisy folders like node_modules and scans source files and manifests to detect languages, entrypoints, modules, classes, imports, and dependencies.",
                    "Then it calculates platform signals such as GitHub Actions, Docker, Terraform, or Azure pipelines and produces quality findings like missing tests, broad dependency surface, or hotspot files.",
                    "After that, the app creates architecture, dependency, sequence, and class diagrams, plus AI-generated summaries and question-answering over the scanned repository context.",
                    "Finally, the UI presents the analysis in a recruiter-friendly product surface with saved projects, comparison support, documentation exports, and clear storytelling.",
                ],
                styles["BodyBullet"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Core Recruiter Q&A", styles["Section"]),
            make_table(
                [
                    ["Recruiter question", "Answer to remember"],
                    ["What problem does this project solve?", "It helps people understand unfamiliar codebases faster by converting repositories into diagrams, summaries, risk signals, and searchable explanations."],
                    ["Why did you build it?", "To demonstrate full-stack product thinking: backend engineering, analysis logic, AI integration, UX polish, and recruiter-ready presentation in one project."],
                    ["What is your role in this project?", "I designed the product direction, built the Express backend, implemented the analyzer logic, integrated the AI layer, and shaped the frontend experience."],
                    ["What makes it different from a normal chatbot?", "It does not only talk. It ingests real source code, derives structured architecture data, compares versions, exports reports, and explains evidence-backed results."],
                    ["What part was the hardest?", "The analyzer was the hardest because it has to infer useful structure from different file types and repository shapes without relying on a single language."],
                    ["How does AI fit in?", "AI is used for architecture explanation and Q&A, but the app still works with fallback summaries when the API is unavailable, which makes the product more reliable."],
                    ["What are the strongest engineering signals here?", "Multi-source intake, secure middleware, webhook validation, fallback mode, quality scoring, compare mode, and a structured service-based backend."],
                ],
                [2.25 * inch, 4.1 * inch],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Technical Recruiter Q&A", styles["Section"]),
            make_table(
                [
                    ["Question", "Strong answer"],
                    ["What stack did you use?", "Node.js, Express, Multer, AdmZip, OpenAI, Mermaid, and a static multi-page frontend with polished interaction design."],
                    ["How is the backend organized?", "There is a thin server entrypoint and an app layer that composes services for source intake, analysis, AI, comparison, question normalization, and session storage."],
                    ["How do uploads and repositories work?", "Users can provide either a public repository URL or a ZIP file. The app clones or extracts into a temporary runtime area and cleans up after analysis."],
                    ["How do you compare two versions?", "The app analyzes a baseline and a current version separately, then computes differences across files, modules, dependencies, relationships, and quality score deltas."],
                    ["How do diagrams get created?", "The analyzer derives module and dependency relationships, then transforms those into Mermaid architecture, sequence, class, and dependency diagram definitions."],
                    ["How do you answer user questions?", "The codebase chat uses the analysis search index and relevant file snippets so answers stay grounded in the scanned repository context."],
                    ["How do you handle failure?", "The AI layer degrades gracefully with fallback summaries, and the app also validates uploads, limits file size, applies rate limiting, and returns structured errors."],
                ],
                [2.2 * inch, 4.15 * inch],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Senior-leaning Recruiter Q&A", styles["Section"]),
            make_table(
                [
                    ["Question", "Strong answer"],
                    ["How is this scalable?", "The current design is service-oriented and modular, so the next scaling step would be moving analysis jobs, persistence, and long-running tasks into background workers and a database."],
                    ["What are the current limitations?", "Session and saved project data are currently memory-based, analysis is heuristic rather than full AST parsing, and large repositories would benefit from async job processing."],
                    ["How would you improve it next?", "I would add persistent storage, deeper parsing, job queues, richer comparison history, user auth, and team workspace features."],
                    ["How is security handled?", "The app sets strict security headers, verifies GitHub webhook signatures, restricts file upload type and size, rate-limits API usage, and avoids exposing secrets through the UI."],
                    ["How do you test or validate it?", "The project includes smoke and site-audit scripts, and the architecture makes service-level testing straightforward because source intake, analysis, and AI behavior are separated."],
                    ["How is deployment handled?", "It is structured as a Node web service with Render-oriented deployment configuration and platform/deployment signals already present in the repository."],
                    ["What business value does it show?", "It reduces onboarding time, helps teams review architectural risk faster, and demonstrates a productized approach to developer tooling."],
                ],
                [2.15 * inch, 4.2 * inch],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Questions You Should Definitely Be Ready For", styles["Section"]),
            *bullets(
                [
                    "Why this project?",
                    "Why this stack?",
                    "What is the hardest technical challenge?",
                    "What exactly does the analyzer do?",
                    "How does compare mode work?",
                    "How is AI used responsibly here?",
                    "What would you improve next?",
                    "How would you scale it for many users?",
                    "How do you make it secure?",
                    "What makes it recruiter-ready and product-like?",
                ],
                styles["BodyBullet"],
            ),
            para("One-line close", styles["Section"]),
            para(
                "This project proves that I can combine product thinking, backend architecture, analysis logic, AI integration, and polished frontend execution into one professional full-stack system.",
                styles["Body"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("HR Recruiter Page", styles["Section"]),
            *bullets(
                [
                    "Why did you build this project?",
                    "What does this project say about you as a developer?",
                    "What was your role end to end?",
                    "How would you explain this to a non-technical person?",
                    "Why should a company care about this kind of product?",
                ],
                styles["BodyBullet"],
            ),
            Spacer(1, 8),
            para("Best short answers", styles["Section"]),
            *bullets(
                [
                    "I built it to show I can do more than code screens. I can design a product, build backend services, create logic-heavy analysis features, integrate AI, and present the result professionally.",
                    "It shows product thinking, engineering structure, and communication skill together.",
                    "I handled the architecture direction, backend flow, analyzer design, AI explanation layer, and recruiter-facing interface polish.",
                    "To a non-technical person, I would say it is a smart tool that reads a code project and explains how the system is built.",
                    "A company should care because tools like this reduce onboarding time and make technical systems easier to understand and review.",
                ],
                styles["BodyBullet"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Technical Manager Page", styles["Section"]),
            *bullets(
                [
                    "How is the project structured internally?",
                    "Why did you choose this backend design?",
                    "How does the analyzer work at a high level?",
                    "Where are the important engineering tradeoffs?",
                    "How would you improve maintainability from here?",
                ],
                styles["BodyBullet"],
            ),
            Spacer(1, 8),
            para("Best short answers", styles["Section"]),
            *bullets(
                [
                    "The project is split into a thin server entrypoint, an app composition layer, service modules, and a multi-page frontend.",
                    "I chose Express because it fits clean API routing, upload handling, compare flows, and service composition well for this product.",
                    "The analyzer scans source files, ignores noisy folders, detects modules and dependencies, derives platform signals, and turns that into summaries and diagrams.",
                    "The main tradeoff is using heuristics for broad multi-language support instead of deeper AST parsing for maximum precision.",
                    "The next maintainability step would be stronger persistence, job queues, deeper tests, and more explicit parsing layers.",
                ],
                styles["BodyBullet"],
            ),
        ]
    )

    flow.append(PageBreak())
    flow.extend(
        [
            para("Final Revision Page", styles["Section"]),
            para("Say this order in interview", styles["Section"]),
            *bullets(
                [
                    "Problem",
                    "Input",
                    "Backend",
                    "Analyzer",
                    "AI",
                    "Frontend",
                    "Security",
                    "Scalability",
                    "Future improvements",
                ],
                styles["BodyBullet"],
            ),
            Spacer(1, 8),
            para("Golden closing line", styles["Section"]),
            para(
                "LumenStack AI is the project where I brought together product thinking, backend architecture, custom analysis logic, AI integration, and polished presentation into one full-stack system.",
                styles["Body"],
            ),
        ]
    )

    return flow


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=letter,
        leftMargin=0.62 * inch,
        rightMargin=0.62 * inch,
        topMargin=0.58 * inch,
        bottomMargin=0.45 * inch,
        title="LUMENSTACK EXPLAINATION",
        author="OpenAI Codex",
    )
    doc.build(story(), onFirstPage=draw_page, onLaterPages=draw_page)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT_FILE)
