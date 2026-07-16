import base64
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.schemas.models import InspectionOut

BRAND_GREEN = colors.HexColor("#377133")
BRAND_MID   = colors.HexColor("#499241")
BRAND_LIGHT = colors.HexColor("#c2e5b2")
BRAND_PALE  = colors.HexColor("#e1f2d9")


def _sig_image(data_url: str) -> Image | None:
    """Decode a base64 data URL and return a ReportLab Image sized for a signature field."""
    try:
        b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
        raw = base64.b64decode(b64)
        return Image(BytesIO(raw), width=3.2 * inch, height=1.0 * inch)
    except Exception:
        return None


def _image_from_url(url: str, max_width: float = 4.5 * inch, max_height: float = 3.0 * inch) -> Image | None:
    """Load an image from a data URL or file path and return a sized ReportLab Image."""
    try:
        if not url:
            return None
        # data URL
        if url.startswith("data:"):
            b64 = url.split(",", 1)[1] if "," in url else url
            raw = base64.b64decode(b64)
            return Image(BytesIO(raw), width=max_width, height=max_height)

        # file path served under /storage or direct path
        path = url.lstrip("/") if url.startswith("/") else url
        p = Path(path)
        if p.exists():
            raw = p.read_bytes()
            return Image(BytesIO(raw), width=max_width, height=max_height)

        return None
    except Exception:
        return None


# ── Answer formatter ──────────────────────────────────────────────────────────

def _fmt_answer(val: object) -> str:
    """Format an answer value as a human-readable string, returning '—' for empty values."""
    if val is None or val == "":
        return "—"
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) if val else "—"
    return str(val)


# ── Logic evaluation (Python port of the frontend's evalRule/activeTriggers,
#    InspectionConductPage.tsx, so nested follow-up questions only appear in
#    the report when their trigger condition was actually satisfied) ──────────

def _eval_rule(rule: dict, value: object) -> bool:
    """Evaluate a single logic rule against an answer value and return whether its condition is met."""
    def _num(s: object) -> float | None:
        try:
            return float(s)
        except (TypeError, ValueError):
            return None

    op = rule.get("op")
    v = "" if value is None else str(value)
    num = _num(v)
    rule_value = rule.get("value", "")

    if op == "is":
        return v == rule_value
    if op == "is_not":
        return v != rule_value
    if op == "is_selected":
        return v != "" and value is not None
    if op == "is_not_selected":
        return v == "" or value is None
    if op == "is_one_of":
        return v in [s.strip() for s in str(rule_value).split(",")]
    if op == "is_not_one_of":
        return v not in [s.strip() for s in str(rule_value).split(",")]
    if op in ("lt", "lte", "eq", "neq", "gte", "gt"):
        rv = _num(rule_value)
        if num is None or rv is None:
            return False
        return {
            "lt": num < rv, "lte": num <= rv, "eq": num == rv,
            "neq": num != rv, "gte": num >= rv, "gt": num > rv,
        }[op]
    if op == "between":
        rv1 = _num(rule_value)
        rv2 = _num(rule.get("value2", rule_value))
        return num is not None and rv1 is not None and rv2 is not None and rv1 <= num <= rv2
    if op == "checked":
        return value is True or v in ("true", "checked")
    if op == "not_checked":
        return not (value is True or v in ("true", "checked"))
    if op == "exists":
        return v != "" and value is not None
    if op == "not_exists":
        return v == "" or value is None
    return False


def _active_triggers(question: dict, value: object) -> set[str]:
    """Return the set of logic triggers whose rules are satisfied by the given answer value."""
    active: set[str] = set()
    for rule in question.get("logic_rules") or []:
        if _eval_rule(rule, value):
            active.add(rule.get("trigger"))
    return active


def generate_inspection_pdf(inspection: InspectionOut, template_schema: dict) -> bytes:
    """Generate and return a PDF document for an inspection report using its template schema."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )

    base = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ITitle", parent=base["Heading1"],
        fontSize=18, textColor=BRAND_GREEN, spaceAfter=2,
    )
    sub_style = ParagraphStyle(
        "ISub", parent=base["Normal"],
        fontSize=8, textColor=colors.HexColor("#666666"), spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "IHeading", parent=base["Heading2"],
        fontSize=11, textColor=BRAND_MID, spaceBefore=12, spaceAfter=5,
    )
    section_style = ParagraphStyle(
        "ISection", parent=base["Heading3"],
        fontSize=10, textColor=BRAND_GREEN, spaceBefore=10, spaceAfter=4,
        borderPad=3,
    )
    cell_style = ParagraphStyle(
        "ICell", parent=base["Normal"], fontSize=9, leading=13,
    )
    label_style = ParagraphStyle(
        "ILabel", parent=base["Normal"],
        fontSize=9, fontName="Helvetica-Bold", leading=13,
    )
    note_style = ParagraphStyle(
        "INote", parent=base["Normal"],
        fontSize=8, textColor=colors.HexColor("#777777"), leading=11, leftIndent=8,
    )
    footer_style = ParagraphStyle(
        "IFooter", parent=base["Normal"],
        fontSize=7, textColor=colors.grey, spaceAfter=0,
    )
    flag_style = ParagraphStyle(
        "IFlag", parent=base["Normal"],
        fontSize=9, leading=13, textColor=colors.HexColor("#cc2200"),
    )

    elements: list = []
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%d %b %Y  %H:%M UTC")

    answers: dict = inspection.answers or {}

    # ── Header ────────────────────────────────────────────────────────────────
    elements.append(Paragraph("RigPro Inspection Report", title_style))
    elements.append(Paragraph(f"Generated: {now_str}", sub_style))

    # ── Inspection Details ────────────────────────────────────────────────────
    elements.append(Paragraph("Inspection Details", heading_style))
    detail_rows = [
        ["Title",        inspection.title or inspection.template_name],
        ["Template",     inspection.template_name],
        ["Site",         inspection.site or "—"],
        ["Conducted By", inspection.conducted_by],
        ["Status",       inspection.status.replace("_", " ").title()],
        ["Score",        f"{inspection.score}%" if inspection.score is not None else "N/A"],
        ["Answered",     f"{inspection.answered_questions} / {inspection.total_questions}"],
        ["Started",      inspection.started_at.strftime("%d %b %Y  %H:%M UTC") if inspection.started_at else "—"],
    ]
    if inspection.completed_at:
        detail_rows.append(["Completed", inspection.completed_at.strftime("%d %b %Y  %H:%M UTC")])
    if inspection.approved_by:
        detail_rows.append(["Approved By", inspection.approved_by])

    detail_table = Table(
        [[Paragraph(r, label_style), Paragraph(v, cell_style)] for r, v in detail_rows],
        colWidths=[1.8 * inch, 4.65 * inch],
    )
    detail_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), BRAND_PALE),
        ("GRID",          (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(detail_table)

    # ── Flagged Items ─────────────────────────────────────────────────────────
    flagged = [f for f in (inspection.flagged_items or []) if isinstance(f, dict)]
    if flagged:
        elements.append(Paragraph("Flagged Items", heading_style))
        flag_rows = [[
            Paragraph("<b>#</b>", cell_style),
            Paragraph("<b>Question</b>", cell_style),
            Paragraph("<b>Answer</b>", cell_style),
            Paragraph("<b>Note</b>", cell_style),
            Paragraph("<b>Action</b>", cell_style),
        ]]
        for i, f in enumerate(flagged, 1):
            action = "Created" if f.get("action_created") else ("Skipped" if f.get("skipped") else "None")
            flag_rows.append([
                Paragraph(str(i), cell_style),
                Paragraph(str(f.get("question_text", "")), flag_style),
                Paragraph(str(f.get("answer_value", "")), cell_style),
                Paragraph(str(f.get("note", "") or ""), note_style),
                Paragraph(action, cell_style),
            ])
        flag_table = Table(flag_rows, colWidths=[0.3 * inch, 2.2 * inch, 1.1 * inch, 1.8 * inch, 0.9 * inch])
        flag_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#ffcccc")),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.HexColor("#880000")),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#ffaaaa")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#fff5f5")]),
        ]))
        elements.append(flag_table)

    # ── Sections & Answers ────────────────────────────────────────────────────
    elements.append(Paragraph("Responses", heading_style))

    sections = template_schema.get("sections", [])
    for section in sections:
        sec_title = section.get("title", "Untitled Section")
        questions = section.get("questions", [])
        if not questions:
            continue

        elements.append(Paragraph(sec_title, section_style))

        q_rows = [[
            Paragraph("<b>Question</b>", cell_style),
            Paragraph("<b>Answer</b>", cell_style),
            Paragraph("<b>Note</b>", cell_style),
        ]]

        def _append_questions(qlist: list, indent: int = 0) -> None:
            """Append answer rows for questions, recursing into nested (branching) follow-up
            questions only when their parent's stored answer actually triggered them."""
            prefix = "↳ " * indent
            for q in qlist:
                qid   = q.get("id", "")
                qtext = q.get("text", "")
                qtype = q.get("type", "")

                ans_obj = answers.get(qid, {})
                if isinstance(ans_obj, dict):
                    val        = ans_obj.get("value")
                    note       = ans_obj.get("note") or ""
                    is_flagged = ans_obj.get("is_flagged", False)
                    media_urls = ans_obj.get("media_urls") or []
                else:
                    val = ans_obj; note = ""; is_flagged = False; media_urls = []

                if qtype != "instruction":
                    q_style = flag_style if is_flagged else cell_style
                    flag_prefix = "⚑ " if is_flagged else ""

                    if qtype == "signature":
                        img = _sig_image(val) if val else None
                        answer_cell = img if img else Paragraph("(no signature)", cell_style)
                    else:
                        answer_cell = Paragraph(_fmt_answer(val), cell_style)

                    q_rows.append([
                        Paragraph(f"{prefix}{flag_prefix}{qtext}", q_style),
                        answer_cell,
                        Paragraph(note, note_style),
                    ])

                    # Embed media images inline (one per row underneath)
                    for media_url in media_urls[:2]:
                        img = _image_from_url(media_url, max_width=2.5 * inch, max_height=1.8 * inch)
                        if img:
                            q_rows.append([Paragraph("", cell_style), img, Paragraph("", cell_style)])

                nested = q.get("nested_questions") or []
                if nested and "ask_questions" in _active_triggers(q, val):
                    _append_questions(nested, indent + 1)

        _append_questions(questions)

        if len(q_rows) > 1:
            q_table = Table(q_rows, colWidths=[2.8 * inch, 2.0 * inch, 1.65 * inch])
            q_table.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0), BRAND_MID),
                ("TEXTCOLOR",     (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID",          (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("VALIGN",        (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, BRAND_PALE]),
            ]))
            elements.append(q_table)

    # ── Supervisor Approval ───────────────────────────────────────────────────
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph("Supervisor Approval", heading_style))

    if inspection.supervisor_signature:
        img = _sig_image(inspection.supervisor_signature)
        sig_cell = img if img else Paragraph("(signature on file)", cell_style)
    else:
        sig_cell = Paragraph("_" * 55, cell_style)

    approval_date = (
        inspection.completed_at.strftime("%d %b %Y  %H:%M UTC")
        if inspection.status == "approved" and inspection.completed_at
        else now_str if inspection.status == "approved"
        else "Pending"
    )
    status_text = (
        '<font color="#1a7c2e"><b>✓ APPROVED</b></font>'
        if inspection.status == "approved"
        else inspection.status.replace("_", " ").title()
    )

    sig_rows: list = [
        [Paragraph("Signature:", label_style), sig_cell],
        [Paragraph("Approved By:", label_style), Paragraph(inspection.approved_by or "—", cell_style)],
        [Paragraph("Date / Time:", label_style), Paragraph(approval_date, cell_style)],
        [Paragraph("Status:", label_style), Paragraph(status_text, cell_style)],
    ]
    sig_table = Table(sig_rows, colWidths=[1.5 * inch, 4.95 * inch])
    sig_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), BRAND_PALE),
        ("GRID",          (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(sig_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph(
        "This document was generated by RigPro Inspection Platform. "
        "All approvals are subject to the applicable safety management system. "
        f"Record ID: {inspection.id}",
        footer_style,
    ))

    doc.build(elements)
    data = buffer.getvalue()
    buffer.close()
    return data
