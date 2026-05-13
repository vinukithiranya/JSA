from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import InspectionRecordDB, TemplateDB
from app.schemas.models import (
    InspectionAnswersUpdate,
    InspectionCompleteRequest,
    InspectionOut,
    InspectionStart,
)
from app.services.store import new_id

router = APIRouter()


def _count_questions(form_schema: dict) -> int:
    total = 0
    for section in form_schema.get("sections", []):
        total += len(section.get("questions", []))
    return total


def _calc_score(form_schema: dict, answers: dict) -> float:
    """Return 0-100 percentage based on non-flagged answered questions."""
    total = 0
    passed = 0
    for section in form_schema.get("sections", []):
        for q in section.get("questions", []):
            qid = q["id"]
            if q.get("type") == "multiple_choice" and q.get("score_map"):
                total += 1
                ans = answers.get(qid, {})
                val = ans.get("value") if isinstance(ans, dict) else None
                score = q["score_map"].get(str(val), 0) if val is not None else 0
                passed += score if score else 0
    if total == 0:
        return 100.0
    return round((passed / total) * 100, 1)


def _to_out(row: InspectionRecordDB) -> InspectionOut:
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
        pdf_url=row.pdf_url,
    )


# ─── Stats (must come before /{inspection_id} routes) ─────────────────────────

@router.get("/stats/summary")
def inspections_summary(db: Session = Depends(get_db)) -> dict:
    rows = db.query(InspectionRecordDB).all()
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
    q = db.query(InspectionRecordDB)
    if status:
        q = q.filter(InspectionRecordDB.status == status)
    rows = q.order_by(InspectionRecordDB.started_at.desc()).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=InspectionOut)
def start_inspection(payload: InspectionStart, db: Session = Depends(get_db)) -> InspectionOut:
    tpl = db.query(TemplateDB).filter(TemplateDB.id == payload.template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    total = _count_questions(tpl.form_schema)
    row = InspectionRecordDB(
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
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(inspection_id: str, db: Session = Depends(get_db)) -> InspectionOut:
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
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
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
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
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")

    tpl = db.query(TemplateDB).filter(TemplateDB.id == row.template_id).first()
    score = _calc_score(tpl.form_schema if tpl else {}, row.answers or {})

    row.status = "completed"
    row.completed_at = datetime.now(timezone.utc)
    row.score = score
    row.flagged_items = [item.model_dump() for item in payload.flagged_items]
    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Approve ──────────────────────────────────────────────────────────────────

@router.post("/{inspection_id}/approve", response_model=InspectionOut)
def approve_inspection(
    inspection_id: str,
    approved_by: str,
    db: Session = Depends(get_db),
) -> InspectionOut:
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    row.status = "approved"
    row.approved_by = approved_by
    db.commit()
    db.refresh(row)
    return _to_out(row)


# ─── Template with schema (for conduct page) ──────────────────────────────────

@router.get("/{inspection_id}/template")
def get_inspection_template(inspection_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    tpl = db.query(TemplateDB).filter(TemplateDB.id == row.template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": tpl.form_schema, "name": tpl.name, "description": tpl.description}


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{inspection_id}", status_code=204)
def delete_inspection(inspection_id: str, db: Session = Depends(get_db)) -> None:
    row = db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    db.delete(row)
    db.commit()

