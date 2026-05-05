from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from app.schemas.models import JsaRecord


def generate_jsa_pdf(jsa: JsaRecord) -> bytes:
    """Generate a PDF report for a JSA record using reportlab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch,
                             topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#377133'),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#499241'),
        spaceAfter=8,
    )

    elements = []

    elements.append(Paragraph("RigPro Job Safety Assessment", title_style))
    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("Job Details", heading_style))
    job_data = [
        ["Job Number", jsa.job_number],
        ["Boat Name", jsa.boat_name],
        ["Service Log", jsa.service_log_number],
        ["Location", jsa.location],
        ["Date", str(jsa.date)],
        ["Status", jsa.status.replace("_", " ").title()],
    ]
    job_table = Table(job_data, colWidths=[2*inch, 4*inch])
    job_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e1f2d9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#c2e5b2')),
    ]))
    elements.append(job_table)
    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("Work Steps", heading_style))
    for idx, step in enumerate(jsa.steps, 1):
        elements.append(Paragraph(f"{idx}. {step}", styles['Normal']))
    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("Identified Hazards", heading_style))
    if jsa.hazards:
        hazard_data = [["Hazard", "Controls", "Pre", "Post"]]
        for h in jsa.hazards:
            hazard_data.append([
                h.hazard_name,
                h.controls[:30] + "..." if len(h.controls) > 30 else h.controls,
                f"{h.pre_score}",
                f"{h.post_score}",
            ])
        hazard_table = Table(hazard_data, colWidths=[1.5*inch, 2*inch, 0.75*inch, 0.75*inch])
        hazard_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#499241')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#c2e5b2')),
        ]))
        elements.append(hazard_table)
    else:
        elements.append(Paragraph("No hazards identified.", styles['Normal']))
    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("Required PPE", heading_style))
    for ppe in jsa.ppe_list:
        elements.append(Paragraph(f"• {ppe}", styles['Normal']))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
