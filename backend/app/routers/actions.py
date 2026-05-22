from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import ActionCommentDB, ActionDB
from app.schemas.models import (
    ActionCommentCreate,
    ActionCommentOut,
    ActionCreate,
    ActionOut,
    ActionStatusUpdate,
)
from app.services.notifications import notify
from app.services.store import new_id

router = APIRouter()


def _to_out(row: ActionDB) -> ActionOut:
    return ActionOut(
        id=row.id,
        title=row.title,
        description=row.description,
        assigned_to=row.assigned_to,
        status=row.status,
        priority=row.priority,
        due_date=row.due_date,
        labels=row.labels or [],
        action_type=row.action_type or "corrective",
        linked_issue_id=row.linked_issue_id,
        linked_jsa_id=row.linked_jsa_id,
        created_by=row.created_by or "u-tech",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post("", response_model=ActionOut)
def create_action(payload: ActionCreate, db: Session = Depends(get_db)) -> ActionOut:
    row = ActionDB(
        id=new_id("act"),
        title=payload.title,
        description=payload.description,
        assigned_to=payload.assigned_to,
        status="to_do",
        priority=payload.priority,
        due_date=payload.due_date,
        labels=payload.labels,
        action_type=payload.action_type,
        linked_issue_id=payload.linked_issue_id,
        linked_jsa_id=payload.linked_jsa_id,
        created_by=payload.created_by,
    )
    db.add(row)
    db.flush()

    if payload.assigned_to:
        due_label = f" — due {payload.due_date}" if payload.due_date else ""
        notify(
            db,
            payload.assigned_to,
            f"Action assigned to you: '{payload.title}'{due_label}",
            event_type="info",
            link="/actions",
        )

    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("", response_model=list[ActionOut])
def list_actions(
    status: str | None = None,
    priority: str | None = None,
    db: Session = Depends(get_db),
) -> list[ActionOut]:
    q = db.query(ActionDB)
    if status:
        q = q.filter(ActionDB.status == status)
    if priority:
        q = q.filter(ActionDB.priority == priority)
    rows = q.order_by(ActionDB.created_at.desc()).all()
    return [_to_out(r) for r in rows]


@router.get("/{action_id}", response_model=ActionOut)
def get_action(action_id: str, db: Session = Depends(get_db)) -> ActionOut:
    row = db.query(ActionDB).filter(ActionDB.id == action_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action not found")
    return _to_out(row)


@router.patch("/{action_id}/status", response_model=ActionOut)
def update_action_status(
    action_id: str, payload: ActionStatusUpdate, db: Session = Depends(get_db)
) -> ActionOut:
    row = db.query(ActionDB).filter(ActionDB.id == action_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action not found")
    row.status = payload.status

    if payload.status == "complete" and row.created_by:
        notify(
            db,
            row.created_by,
            f"Action completed: '{row.title}'",
            event_type="success",
            link="/actions",
        )

    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{action_id}", status_code=204)
def delete_action(action_id: str, db: Session = Depends(get_db)) -> None:
    row = db.query(ActionDB).filter(ActionDB.id == action_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action not found")
    db.delete(row)
    db.commit()


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/{action_id}/comments", response_model=list[ActionCommentOut])
def list_comments(action_id: str, db: Session = Depends(get_db)) -> list[ActionCommentOut]:
    rows = (
        db.query(ActionCommentDB)
        .filter(ActionCommentDB.action_id == action_id)
        .order_by(ActionCommentDB.created_at.asc())
        .all()
    )
    return [
        ActionCommentOut(
            id=r.id,
            action_id=r.action_id,
            user_id=r.user_id,
            message=r.message,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{action_id}/comments", response_model=ActionCommentOut)
def add_comment(
    action_id: str, payload: ActionCommentCreate, db: Session = Depends(get_db)
) -> ActionCommentOut:
    action = db.query(ActionDB).filter(ActionDB.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    comment = ActionCommentDB(
        id=new_id("ac"),
        action_id=action_id,
        user_id=payload.user_id,
        message=payload.message,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return ActionCommentOut(
        id=comment.id,
        action_id=comment.action_id,
        user_id=comment.user_id,
        message=comment.message,
        created_at=comment.created_at,
    )


# ─── Analytics ───────────────────────────────────────────────────────────────

@router.get("/stats/summary")
def actions_summary(db: Session = Depends(get_db)) -> dict:
    all_actions = db.query(ActionDB).all()
    total = len(all_actions)
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    today = date.today()
    overdue = 0
    for a in all_actions:
        by_status[a.status] = by_status.get(a.status, 0) + 1
        by_priority[a.priority] = by_priority.get(a.priority, 0) + 1
        if a.due_date and a.due_date < today and a.status not in ("complete", "cant_do"):
            overdue += 1
    return {
        "total": total,
        "overdue": overdue,
        "by_status": by_status,
        "by_priority": by_priority,
    }
