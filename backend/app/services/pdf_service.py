import base64
from datetime import datetime, timezone
from io import BytesIO

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

from app.schemas.models import JsaRecord

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
