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

from app.schemas.models import InspectionOut, JsaRecord

BRAND_GREEN = colors.HexColor("#377133")
BRAND_MID   = colors.HexColor("#499241")
BRAND_LIGHT = colors.HexColor("#c2e5b2")
BRAND_PALE  = colors.HexColor("#e1f2d9")


def _sig_image(data_url: str) -> Image | None:
    try:
        b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
        raw = base64.b64decode(b64)
        return Image(BytesIO(raw), width=3.2 * inch, height=1.0 * inch)
    except Exception:
        return None


def _image_from_url(url: str, max_width: float = 4.5 * inch, max_height: float = 3.0 * inch) -> Image | None:
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


def generate_jsa_pdf(jsa: JsaRecord) -> bytes:
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
        "RTitle",
        parent=base["Heading1"],
        fontSize=18,
        textColor=BRAND_GREEN,
        spaceAfter=2,
    )
    sub_style = ParagraphStyle(
        "RSub",
        parent=base["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#666666"),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "RHeading",
        parent=base["Heading2"],
        fontSize=11,
        textColor=BRAND_MID,
        spaceBefore=10,
        spaceAfter=5,
    )
    cell_style = ParagraphStyle(
        "RCell",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
    )
    label_style = ParagraphStyle(
        "RLabel",
        parent=base["Normal"],
        fontSize=9,
        fontName="Helvetica-Bold",
        leading=13,
    )
    footer_style = ParagraphStyle(
        "RFooter",
        parent=base["Normal"],
        fontSize=7,
        textColor=colors.grey,
        spaceAfter=0,
    )

    elements: list = []
    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime("%d %b %Y  %H:%M UTC")

    # ── Header ────────────────────────────────────────────────────────────────
    elements.append(Paragraph("RigPro Job Safety Assessment", title_style))
    elements.append(Paragraph(f"Generated: {now_str}", sub_style))

    # ── Job Details ───────────────────────────────────────────────────────────
    elements.append(Paragraph("Job Details", heading_style))
    job_rows = [
        ["Job Number",    jsa.job_number],
        ["Vessel / Boat", jsa.boat_name],
        ["Service Log",   jsa.service_log_number],
        ["Location",      jsa.location],
        ["Date",          str(jsa.date)],
        ["Status",        jsa.status.replace("_", " ").title()],
    ]
    if jsa.approved_by:
        job_rows.append(["Approved By", jsa.approved_by])
    job_table = Table(
        [[Paragraph(r, label_style), Paragraph(v, cell_style)] for r, v in job_rows],
        colWidths=[1.8 * inch, 4.65 * inch],
    )
    job_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), BRAND_PALE),
        ("GRID",          (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(job_table)

    # ── Work Steps ────────────────────────────────────────────────────────────
    elements.append(Paragraph("Work Steps", heading_style))
    for idx, step in enumerate(jsa.steps, 1):
        elements.append(Paragraph(f"{idx}.&nbsp;&nbsp;{step}", cell_style))

    # ── Identified Hazards ────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(Paragraph("Identified Hazards", heading_style))
    if jsa.hazards:
        hdr = [
            Paragraph("<b>Hazard</b>", cell_style),
            Paragraph("<b>Controls Required</b>", cell_style),
            Paragraph("<b>Pre</b>", cell_style),
            Paragraph("<b>Post</b>", cell_style),
        ]
        hazard_rows = [hdr]
        for h in jsa.hazards:
            hazard_rows.append([
                Paragraph(h.hazard_name, cell_style),
                Paragraph(h.controls, cell_style),
                Paragraph(f"<b>{h.pre_score}</b>", cell_style),
                Paragraph(f"<b>{h.post_score}</b>", cell_style),
            ])
        hazard_table = Table(
            hazard_rows,
            colWidths=[1.6 * inch, 3.55 * inch, 0.55 * inch, 0.55 * inch],
        )
        hazard_table.setStyle(TableStyle([
            ("BACKGROUND",     (0, 0), (-1, 0),  BRAND_MID),
            ("TEXTCOLOR",      (0, 0), (-1, 0),  colors.whitesmoke),
            ("GRID",           (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
            ("TOPPADDING",     (0, 0), (-1, -1), 6),
            ("VALIGN",         (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_PALE]),
        ]))
        elements.append(hazard_table)
    else:
        elements.append(Paragraph("No hazards identified.", cell_style))

    # ── Required PPE ──────────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(Paragraph("Required PPE", heading_style))
    if jsa.ppe_list:
        ppe_rows = [[Paragraph(f"• &nbsp;{p}", cell_style)] for p in jsa.ppe_list]
        ppe_table = Table(ppe_rows, colWidths=[6.45 * inch])
        ppe_table.setStyle(TableStyle([
            ("GRID",           (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 5),
            ("TOPPADDING",     (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, BRAND_PALE]),
        ]))
        elements.append(ppe_table)
    else:
        elements.append(Paragraph("No PPE items specified.", cell_style))

    # ── Supervisor Approval ───────────────────────────────────────────────────
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph("Supervisor Approval", heading_style))

    sig_rows: list = []

    if jsa.supervisor_signature:
        img = _sig_image(jsa.supervisor_signature)
        sig_cell = img if img else Paragraph("(signature on file)", cell_style)
    else:
        sig_cell = Paragraph("_" * 55, cell_style)

    sig_rows.append([Paragraph("Signature:", label_style), sig_cell])
    sig_rows.append([
        Paragraph("Approved By:", label_style),
        Paragraph(jsa.approved_by or "—", cell_style),
    ])
    approval_date = (
        now_utc.strftime("%d %b %Y  %H:%M UTC")
        if jsa.status == "approved"
        else "Pending"
    )
    sig_rows.append([Paragraph("Date / Time:", label_style), Paragraph(approval_date, cell_style)])

    status_text = (
        '<font color="#1a7c2e"><b>✓ APPROVED</b></font>'
        if jsa.status == "approved"
        else jsa.status.replace("_", " ").title()
    )
    sig_rows.append([Paragraph("Status:", label_style), Paragraph(status_text, cell_style)])

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
        "This document was generated by RigPro JSA Platform. "
        "All approvals are subject to the applicable safety management system. "
        f"Record ID: {jsa.id}",
        footer_style,
    ))

    # ── Attachments (images) ──────────────────────────────────────────────────
    try:
        attachments = []
        answers = getattr(jsa, "answers", {}) or {}
        for qid, ans in (answers.items() if isinstance(answers, dict) else []):
            # ans may be a dict with media_urls
            if isinstance(ans, dict):
                for m in ans.get("media_urls", []) or []:
                    img = _image_from_url(m)
                    if img:
                        attachments.append((qid, m, img))

        if attachments:
            elements.append(Spacer(1, 0.15 * inch))
            elements.append(Paragraph("Attachments", heading_style))
            for qid, src, img in attachments:
                elements.append(Paragraph(f"Question: {qid}", label_style))
                elements.append(img)
                elements.append(Spacer(1, 0.05 * inch))
    except Exception:
        # don't let attachments break PDF generation
        pass

    doc.build(elements)
    data = buffer.getvalue()
    buffer.close()
    return data


# ── Answer formatter ──────────────────────────────────────────────────────────

def _fmt_answer(val: object) -> str:
    if val is None or val == "":
        return "—"
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) if val else "—"
    return str(val)


def generate_inspection_pdf(inspection: InspectionOut, template_schema: dict) -> bytes:
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

        for q in questions:
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

            val_str = _fmt_answer(val)

            # Skip media/signature/instruction rows but add a note row for media
            if qtype in ("instruction",):
                continue

            q_style = flag_style if is_flagged else cell_style
            flag_prefix = "⚑ " if is_flagged else ""

            q_rows.append([
                Paragraph(f"{flag_prefix}{qtext}", q_style),
                Paragraph(val_str, cell_style),
                Paragraph(note, note_style),
            ])

            # Embed media images inline (one per row underneath)
            for media_url in media_urls[:2]:
                img = _image_from_url(media_url, max_width=2.5 * inch, max_height=1.8 * inch)
                if img:
                    q_rows.append([Paragraph("", cell_style), img, Paragraph("", cell_style)])

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
