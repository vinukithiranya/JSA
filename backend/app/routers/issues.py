from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import IssueDB, IssueCommentDB
from app.schemas.models import (
    IssueCommentCreate,
    IssueCommentOut,
    IssueCreate,
    IssueOut,
    IssueStatusUpdate,
)
from app.services.store import new_id

router = APIRouter()


def _to_out(row: IssueDB) -> IssueOut:
    return IssueOut(
        id=row.id,
        title=row.title,
        description=row.description or "",
        issue_type=row.issue_type,
        category=row.category,
        site=row.site or "",
        priority=row.priority,
        status=row.status,
        latitude=row.latitude,
        longitude=row.longitude,
        media_urls=row.media_urls or [],
        custom_answers=row.custom_answers or {},
        reported_by=row.reported_by,
        assigned_to=row.assigned_to,
        linked_jsa_id=row.linked_jsa_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        resolved_at=row.resolved_at,
    )


@router.get("", response_model=list[IssueOut])
def list_issues(
    status: str | None = None,
    priority: str | None = None,
    issue_type: str | None = None,
    db: Session = Depends(get_db),
) -> list[IssueOut]:
    q = db.query(IssueDB)
    if status:
        q = q.filter(IssueDB.status == status)
    if priority:
        q = q.filter(IssueDB.priority == priority)
    if issue_type:
        q = q.filter(IssueDB.issue_type == issue_type)
    rows = q.order_by(IssueDB.created_at.desc()).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=IssueOut)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)) -> IssueOut:
    row = IssueDB(
        id=new_id("iss"),
        title=payload.title,
        description=payload.description,
        issue_type=payload.issue_type,
        category=payload.category,
        site=payload.site,
        priority=payload.priority,
        status="open",
        latitude=payload.latitude,
        longitude=payload.longitude,
        media_urls=[],
        custom_answers=payload.custom_answers,
        reported_by=payload.reported_by,
        assigned_to=None,
        linked_jsa_id=payload.linked_jsa_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: str, db: Session = Depends(get_db)) -> IssueOut:
    row = db.query(IssueDB).filter(IssueDB.id == issue_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _to_out(row)


@router.patch("/{issue_id}/status", response_model=IssueOut)
def update_issue_status(
    issue_id: str, payload: IssueStatusUpdate, db: Session = Depends(get_db)
) -> IssueOut:
    row = db.query(IssueDB).filter(IssueDB.id == issue_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    row.status = payload.status
    if payload.assigned_to:
        row.assigned_to = payload.assigned_to
    if payload.status == "resolved":
        row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{issue_id}", status_code=204)
def delete_issue(issue_id: str, db: Session = Depends(get_db)) -> None:
    row = db.query(IssueDB).filter(IssueDB.id == issue_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    db.delete(row)
    db.commit()


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/{issue_id}/comments", response_model=list[IssueCommentOut])
def list_comments(issue_id: str, db: Session = Depends(get_db)) -> list[IssueCommentOut]:
    rows = (
        db.query(IssueCommentDB)
        .filter(IssueCommentDB.issue_id == issue_id)
        .order_by(IssueCommentDB.created_at.asc())
        .all()
    )
    return [
        IssueCommentOut(
            id=r.id,
            issue_id=r.issue_id,
            user_id=r.user_id,
            message=r.message,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/{issue_id}/comments", response_model=IssueCommentOut)
def add_comment(
    issue_id: str, payload: IssueCommentCreate, db: Session = Depends(get_db)
) -> IssueCommentOut:
    issue = db.query(IssueDB).filter(IssueDB.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    comment = IssueCommentDB(
        id=new_id("ic"),
        issue_id=issue_id,
        user_id=payload.user_id,
        message=payload.message,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return IssueCommentOut(
        id=comment.id,
        issue_id=comment.issue_id,
        user_id=comment.user_id,
        message=comment.message,
        created_at=comment.created_at,
    )


# ─── Analytics ───────────────────────────────────────────────────────────────

@router.get("/stats/summary")
def issues_summary(db: Session = Depends(get_db)) -> dict:
    all_issues = db.query(IssueDB).all()
    total = len(all_issues)
    by_status = {}
    by_type = {}
    by_priority = {}
    for i in all_issues:
        by_status[i.status] = by_status.get(i.status, 0) + 1
        by_type[i.issue_type] = by_type.get(i.issue_type, 0) + 1
        by_priority[i.priority] = by_priority.get(i.priority, 0) + 1
    return {
        "total": total,
        "by_status": by_status,
        "by_type": by_type,
        "by_priority": by_priority,
    }
