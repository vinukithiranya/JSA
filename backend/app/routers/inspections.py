from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import inspections_repository, issues_repository, templates_repository
from app.schemas.models import (
    InspectionAnswersUpdate,
    InspectionApproveRequest,
    InspectionCompleteRequest,
    InspectionOut,
    InspectionStart,
)
from app.services.notifications import notify_supervisors
from app.services.pdf_service import generate_inspection_pdf
from app.services.store import new_id

router = APIRouter()


def _count_questions(form_schema: dict) -> int:
    """Return the total number of questions across all sections of a form schema."""
    total = 0
    for section in form_schema.get("sections", []):
        total += len(section.get("questions", []))
    return total


def _calc_score(form_schema: dict, answers: dict) -> float:
    """Return 0–100 based on earned score_map points vs maximum possible points."""
    earned = 0.0
    max_pts = 0.0
    for section in form_schema.get("sections", []):
        for q in section.get("questions", []):
            if q.get("type") != "multiple_choice" or not q.get("score_map"):
                continue
            score_map = q["score_map"]
            valid = [v for v in score_map.values() if isinstance(v, (int, float)) and v is not None]
            if not valid:
                continue
            q_max = max(valid)
            max_pts += q_max
            ans = answers.get(q["id"], {})
            val = ans.get("value") if isinstance(ans, dict) else None
            if val is not None:
                pts = score_map.get(str(val))
                if isinstance(pts, (int, float)):
                    earned += pts
    if max_pts == 0:
        return 100.0
    return round((earned / max_pts) * 100, 1)


def _to_out(row) -> InspectionOut:
    """Convert an InspectionRecordDB ORM row to an InspectionOut schema object."""
    return InspectionOut(
        id=row.id,
        template_id=row.template_id,
        template_name=row.template_name or "",
        title=row.title or "",
        site=row.site or "",
        conducted_by=row.conducted_by,
        status=row.status,
        answers=row.answers or {},
        flagged_items=row.flagged_items or [],
        score=row.score,
        total_questions=row.total_questions,
        answered_questions=row.answered_questions,
        started_at=row.started_at,
        completed_at=row.completed_at,
        approved_by=row.approved_by,
        supervisor_signature=row.supervisor_signature,
        pdf_url=row.pdf_url,
    )


# ─── Stats (must come before /{inspection_id} routes) ─────────────────────────

@router.get("/stats/summary")
def inspections_summary(db: Session = Depends(get_db)) -> dict:
    """Return aggregate statistics for all inspections including counts by status and average score."""
    rows = inspections_repository.list_all(db)
    total = len(rows)
    by_status: dict[str, int] = {}
    scores = [r.score for r in rows if r.score is not None]
    for r in rows:
        by_status[r.status] = by_status.get(r.status, 0) + 1
    return {
        "total": total,
        "by_status": by_status,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
    }


# ─── List / Start ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[InspectionOut])
def list_inspections(
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[InspectionOut]:
    """Return all inspections, optionally filtered by status, ordered by start time descending."""
    rows = inspections_repository.list_all(db, status=status)
    return [_to_out(r) for r in rows]


@router.post("", response_model=InspectionOut)
def start_inspection(payload: InspectionStart, db: Session = Depends(get_db)) -> InspectionOut:
    """Create and persist a new in-progress inspection record from the given template."""
    tpl = templates_repository.get_by_id(db, payload.template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    total = _count_questions(tpl.form_schema)
    row = inspections_repository.create(
        db,
        id=new_id("insp"),
        template_id=payload.template_id,
        template_name=tpl.name,
        title=payload.title or tpl.name,
        site=payload.site,
        conducted_by=payload.conducted_by,
        status="in_progress",
        answers={},
        flagged_items=[],
        score=None,
        total_questions=total,
        answered_questions=0,
    )
    return _to_out(row)


@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(inspection_id: str, db: Session = Depends(get_db)) -> InspectionOut:
    """Retrieve a single inspection record by its ID."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return _to_out(row)


# ─── Save answers (auto-save) ─────────────────────────────────────────────────

@router.patch("/{inspection_id}/answers", response_model=InspectionOut)
def save_answers(
    inspection_id: str,
    payload: InspectionAnswersUpdate,
    db: Session = Depends(get_db),
) -> InspectionOut:
    """Merge new answers into an existing inspection and update the answered question count."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")

    merged = dict(row.answers or {})
    for qid, ans in payload.answers.items():
        merged[qid] = {
            "value": ans.value,
            "note": ans.note,
            "is_flagged": ans.is_flagged,
            "media_urls": ans.media_urls,
        }
    row.answers = merged
    row.answered_questions = sum(
        1 for a in merged.values()
        if isinstance(a, dict) and a.get("value") is not None
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Complete ─────────────────────────────────────────────────────────────────

@router.post("/{inspection_id}/complete", response_model=InspectionOut)
def complete_inspection(
    inspection_id: str,
    payload: InspectionCompleteRequest,
    db: Session = Depends(get_db),
) -> InspectionOut:
    """Mark an inspection as pending approval, calculate its score, raise issues for flagged items, and notify supervisors."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")

    tpl = templates_repository.get_by_id(db, row.template_id)
    score = _calc_score(tpl.form_schema if tpl else {}, row.answers or {})

    row.status = "pending_approval"
    row.completed_at = datetime.now(timezone.utc)
    row.score = score
    row.flagged_items = [item.model_dump() for item in payload.flagged_items]

    # Auto-create an Issue for each non-skipped flagged item
    active_flags = [f for f in payload.flagged_items if not f.skipped]
    for flagged in active_flags:
        issues_repository.create(
            db,
            id=new_id("iss"),
            title=f"Flagged: {flagged.question_text}",
            description=(
                f"Flagged response during inspection '{row.template_name}'.\n"
                f"Answer given: {flagged.answer_value}\n"
                f"Note: {flagged.note or '(none)'}"
            ),
            issue_type="hazard",
            category="Inspection Flag",
            site=row.site or "",
            priority="high",
            status="open",
            reported_by=row.conducted_by,
            media_urls=[],
            custom_answers={},
        )

    # Notify supervisors based on score and flags
    site_label = f" — {row.site}" if row.site else ""
    flag_count = len(active_flags)

    if score < 70:
        notify_supervisors(
            db,
            f"Critical inspection score: {score}% on '{row.template_name}'{site_label}. "
            f"{flag_count} flagged item{'s' if flag_count != 1 else ''} auto-raised as issues.",
            event_type="critical",
            link=f"/inspections/report/{row.id}",
        )
    elif flag_count > 0:
        notify_supervisors(
            db,
            f"Inspection completed with {flag_count} flagged item{'s' if flag_count != 1 else ''} — "
            f"'{row.template_name}'{site_label}. Score: {score}%",
            event_type="warning",
            link=f"/inspections/report/{row.id}",
        )
    else:
        notify_supervisors(
            db,
            f"Inspection completed — '{row.template_name}'{site_label}. Score: {score}%",
            event_type="info",
            link=f"/inspections/report/{row.id}",
        )

    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Approve ──────────────────────────────────────────────────────────────────

@router.post("/{inspection_id}/approve", response_model=InspectionOut)
def approve_inspection(
    inspection_id: str,
    payload: InspectionApproveRequest,
    db: Session = Depends(get_db),
) -> InspectionOut:
    """Approve an inspection, recording the approver and optional supervisor signature."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    row.status = "approved"
    row.approved_by = payload.approved_by
    if payload.signature:
        row.supervisor_signature = payload.signature
    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Template with schema (for conduct page) ──────────────────────────────────

@router.get("/{inspection_id}/template")
def get_inspection_template(inspection_id: str, db: Session = Depends(get_db)) -> dict:
    """Return the form schema and metadata for the template associated with an inspection."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    tpl = templates_repository.get_by_id(db, row.template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": tpl.form_schema, "name": tpl.name, "description": tpl.description}


# ─── PDF Report ───────────────────────────────────────────────────────────────

@router.get("/{inspection_id}/report")
def get_inspection_report(inspection_id: str, db: Session = Depends(get_db)) -> FileResponse:
    """Generate a PDF report for an inspection and return it as a file download."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")

    tpl = templates_repository.get_by_id(db, row.template_id)
    template_schema = tpl.form_schema if tpl else {"sections": []}

    inspection_out = _to_out(row)
    pdf_bytes = generate_inspection_pdf(inspection_out, template_schema)

    reports_dir = Path("storage") / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    output_file = reports_dir / f"{row.id}.pdf"
    output_file.write_bytes(pdf_bytes)

    row.pdf_url = str(output_file)
    db.commit()

    safe_name = (row.title or row.template_name or "Inspection").replace(" ", "_")
    return FileResponse(str(output_file), media_type="application/pdf", filename=f"Inspection_{safe_name}.pdf")


# ─── Archive ─────────────────────────────────────────────────────────────────

@router.patch("/{inspection_id}/archive", response_model=InspectionOut)
def archive_inspection(inspection_id: str, db: Session = Depends(get_db)) -> InspectionOut:
    """Set an inspection's status to archived, removing it from the active queue."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if row.status not in ("in_progress",):
        raise HTTPException(status_code=400, detail="Only in-progress inspections can be archived")
    row.status = "archived"
    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{inspection_id}", status_code=204)
def delete_inspection(inspection_id: str, db: Session = Depends(get_db)) -> None:
    """Delete an inspection record from the database by its ID."""
    row = inspections_repository.get(db, inspection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    inspections_repository.delete(db, row)
    db.commit()
