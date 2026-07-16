from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.repositories import actions_repository, inspections_repository, issues_repository

router = APIRouter()

@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    """Return a high-level summary of inspections, issues, and actions."""
    inspections = inspections_repository.list_all(db)
    issues = issues_repository.list_all(db)
    actions = actions_repository.list_all(db)
    completed_insp = [i for i in inspections if i.status == "completed"]
    open_issues = [i for i in issues if i.status == "open"]
    overdue_actions = []
    from datetime import date
    today = date.today()
    for a in actions:
        if a.status not in ("complete", "cant_do") and a.due_date and a.due_date < today:
            overdue_actions.append(a)
    return {
        "total_inspections": len(inspections),
        "completed_inspections": len(completed_insp),
        "inspection_completion_rate": round(len(completed_insp) / max(len(inspections), 1) * 100, 1),
        "total_issues": len(issues),
        "open_issues": len(open_issues),
        "total_actions": len(actions),
        "overdue_actions": len(overdue_actions),
        "completed_actions": len([a for a in actions if a.status == "complete"]),
    }

@router.get("/analytics/inspections")
def inspection_analytics(db: Session = Depends(get_db)):
    """Return inspection analytics broken down by status, template, score, and flagged rate."""
    records = inspections_repository.list_all(db)
    by_status: dict = {}
    by_template: dict = {}
    scores = [r.score for r in records if r.score is not None]
    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        by_template[r.template_name] = by_template.get(r.template_name, 0) + 1
    return {
        "total": len(records),
        "by_status": by_status,
        "by_template": sorted([{"name": k, "count": v} for k, v in by_template.items()], key=lambda x: -x["count"])[:10],
        "average_score": round(sum(scores) / max(len(scores), 1), 1),
        "flagged_rate": round(sum(1 for r in records if r.flagged_items) / max(len(records), 1) * 100, 1),
    }

@router.get("/analytics/issues")
def issue_analytics(db: Session = Depends(get_db)):
    """Return issue counts grouped by status, priority, and type."""
    records = issues_repository.list_all(db)
    by_status: dict = {}
    by_priority: dict = {}
    by_type: dict = {}
    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        by_priority[r.priority] = by_priority.get(r.priority, 0) + 1
        by_type[r.issue_type] = by_type.get(r.issue_type, 0) + 1
    return {"total": len(records), "by_status": by_status, "by_priority": by_priority, "by_type": by_type}

@router.get("/analytics/actions")
def action_analytics(db: Session = Depends(get_db)):
    """Return action counts grouped by status and priority, including overdue count."""
    from datetime import date
    today = date.today()
    records = actions_repository.list_all(db)
    by_status: dict = {}
    by_priority: dict = {}
    overdue = 0
    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        by_priority[r.priority] = by_priority.get(r.priority, 0) + 1
        if r.status not in ("complete", "cant_do") and r.due_date and r.due_date < today:
            overdue += 1
    return {"total": len(records), "by_status": by_status, "by_priority": by_priority, "overdue": overdue}
