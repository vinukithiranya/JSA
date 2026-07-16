from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import inspections_repository, issues_repository, templates_repository
from app.services.notifications import notify_supervisors
from app.services.store import new_id

router = APIRouter()


# ── Request / response schemas (local to this module) ────────────────────────

class InspectionSyncItem(BaseModel):
    id: str
    template_id: str
    template_name: str = ""
    title: str = ""
    site: str = ""
    conducted_by: str
    status: str
    answers: dict = Field(default_factory=dict)
    flagged_items: list[dict] = Field(default_factory=list)
    score: Optional[float] = None
    total_questions: int = 0
    answered_questions: int = 0
    started_at: datetime
    completed_at: Optional[datetime] = None


class IssueSyncItem(BaseModel):
    id: str
    title: str
    description: str = ""
    issue_type: str = "hazard"
    category: str = "General"
    site: str = ""
    priority: str = "medium"
    status: str = "open"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    media_urls: list[str] = Field(default_factory=list)
    custom_answers: dict = Field(default_factory=dict)
    reported_by: str
    assigned_to: Optional[str] = None
    created_at: datetime


class SyncBatch(BaseModel):
    inspections: list[InspectionSyncItem] = Field(default_factory=list)
    issues: list[IssueSyncItem] = Field(default_factory=list)


class SyncResult(BaseModel):
    synced_inspections: list[str]
    synced_issues: list[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calc_score(form_schema: dict, answers: dict) -> float:
    earned = 0.0
    max_pts = 0.0
    for section in form_schema.get("sections", []):
        for q in section.get("questions", []):
            if q.get("type") != "multiple_choice" or not q.get("score_map"):
                continue
            score_map = q["score_map"]
            valid = [v for v in score_map.values() if isinstance(v, (int, float))]
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
    return round((earned / max_pts) * 100, 1) if max_pts else 100.0


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=SyncResult)
def sync_offline_data(
    payload: SyncBatch,
    db: Session = Depends(get_db),
) -> SyncResult:
    """Accept offline-created inspections and issues, upsert them, and run completion side-effects."""
    synced_inspections: list[str] = []
    synced_issues: list[str] = []

    for item in payload.inspections:
        # Skip if already synced from a previous attempt
        if inspections_repository.get_by_id_or_none(db, item.id):
            synced_inspections.append(item.id)
            continue

        tpl = templates_repository.get_by_id(db, item.template_id)
        score = _calc_score(tpl.form_schema if tpl else {}, item.answers)

        row = inspections_repository.add(
            db,
            id=item.id,
            template_id=item.template_id,
            template_name=item.template_name or (tpl.name if tpl else ""),
            title=item.title or (tpl.name if tpl else ""),
            site=item.site,
            conducted_by=item.conducted_by,
            status=item.status,
            answers=item.answers,
            flagged_items=item.flagged_items,
            score=score,
            total_questions=item.total_questions,
            answered_questions=item.answered_questions,
            started_at=item.started_at,
            completed_at=item.completed_at,
        )

        # Run completion side-effects for records submitted offline
        if item.status in ("pending_approval", "completed"):
            active_flags = [f for f in item.flagged_items if not f.get("skipped")]
            for flagged in active_flags:
                issues_repository.create(
                    db,
                    id=new_id("iss"),
                    title=f"Flagged: {flagged.get('question_text', 'Unknown')}",
                    description=(
                        f"Flagged during offline inspection '{row.template_name}'.\n"
                        f"Answer: {flagged.get('answer_value', '')}"
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
            notify_supervisors(
                db,
                f"Offline inspection synced — '{row.template_name}'. Score: {score}%",
                event_type="info",
                link=f"/inspections/report/{row.id}",
            )

        synced_inspections.append(item.id)

    for item in payload.issues:
        if issues_repository.get_by_id_or_none(db, item.id):
            synced_issues.append(item.id)
            continue
        issues_repository.create(
            db,
            id=item.id,
            title=item.title,
            description=item.description,
            issue_type=item.issue_type,
            category=item.category,
            site=item.site,
            priority=item.priority,
            status=item.status,
            latitude=item.latitude,
            longitude=item.longitude,
            media_urls=item.media_urls,
            custom_answers=item.custom_answers,
            reported_by=item.reported_by,
            assigned_to=item.assigned_to,
            created_at=item.created_at,
        )
        synced_issues.append(item.id)

    db.commit()
    return SyncResult(
        synced_inspections=synced_inspections,
        synced_issues=synced_issues,
    )
