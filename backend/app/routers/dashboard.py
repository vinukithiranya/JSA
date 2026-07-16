from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import actions_repository, inspections_repository, issues_repository

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db)) -> dict:
    """Return KPI summary and status breakdown for all inspection records."""
    from datetime import date
    today = date.today()

    inspections = inspections_repository.list_all(db)
    issues = issues_repository.list_all(db)
    actions = actions_repository.list_all(db)

    total = len(inspections)
    pending = len([r for r in inspections if r.status == "pending_approval"])
    approved = len([r for r in inspections if r.status == "approved"])
    in_progress = len([r for r in inspections if r.status == "in_progress"])

    completion_rate = 0 if total == 0 else round((approved / total) * 100, 2)

    scores = [r.score for r in inspections if r.score is not None]
    avg_score = 0 if not scores else round(sum(scores) / len(scores), 1)

    open_issues = len([i for i in issues if i.status == "open"])
    overdue_actions = len([
        a for a in actions
        if a.status not in ("complete", "cant_do") and a.due_date and a.due_date < today
    ])

    return {
        "kpi": {
            "total_inspections": total,
            "pending_approval": pending,
            "approved": approved,
            "in_progress": in_progress,
            "completion_rate": completion_rate,
            "avg_score": avg_score,
            "open_issues": open_issues,
            "overdue_actions": overdue_actions,
        },
        "status_breakdown": [
            {"status": "in_progress", "count": in_progress},
            {"status": "pending_approval", "count": pending},
            {"status": "approved", "count": approved},
        ],
    }
