from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import issues_repository as repo
from app.schemas.models import (
    IssueCommentCreate,
    IssueCommentOut,
    IssueCreate,
    IssueOut,
    IssueStatusUpdate,
)
from app.services.notifications import notify, notify_supervisors
from app.services.store import new_id

router = APIRouter()


def _to_out(row) -> IssueOut:
    """Convert an IssueDB ORM row to an IssueOut schema object."""
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
    """Return all issues, optionally filtered by status, priority, or issue type."""
    rows = repo.list_all(db, status=status, priority=priority, issue_type=issue_type)
    return [_to_out(r) for r in rows]


@router.post("", response_model=IssueOut)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)) -> IssueOut:
    """Create a new issue and notify supervisors based on its priority."""
    row = repo.create(
        db,
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

    site_label = f" — {payload.site}" if payload.site else ""
    if payload.priority == "high":
        notify_supervisors(
            db,
            f"HIGH priority issue raised: '{payload.title}'{site_label}",
            event_type="critical",
            link="/issues",
        )
    else:
        notify_supervisors(
            db,
            f"New issue raised: '{payload.title}'{site_label}",
            event_type="warning",
            link="/issues",
        )

    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: str, db: Session = Depends(get_db)) -> IssueOut:
    """Retrieve a single issue by its ID."""
    row = repo.get(db, issue_id)
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _to_out(row)


@router.patch("/{issue_id}/status", response_model=IssueOut)
def update_issue_status(
    issue_id: str, payload: IssueStatusUpdate, db: Session = Depends(get_db)
) -> IssueOut:
    """Update the status and optional assignee of an issue, sending relevant notifications."""
    row = repo.get(db, issue_id)
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_assigned = row.assigned_to
    row.status = payload.status

    if payload.assigned_to:
        row.assigned_to = payload.assigned_to
        if payload.assigned_to != old_assigned:
            notify(
                db,
                payload.assigned_to,
                f"Issue assigned to you: '{row.title}'",
                event_type="info",
                link="/issues",
            )

    if payload.status == "resolved":
        row.resolved_at = datetime.now(timezone.utc)
        if row.reported_by:
            notify(
                db,
                row.reported_by,
                f"Issue resolved: '{row.title}'",
                event_type="success",
                link="/issues",
            )

    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{issue_id}", status_code=204)
def delete_issue(issue_id: str, db: Session = Depends(get_db)) -> None:
    """Delete an issue by its ID."""
    row = repo.get(db, issue_id)
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    repo.delete(db, row)
    db.commit()


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/{issue_id}/comments", response_model=list[IssueCommentOut])
def list_comments(issue_id: str, db: Session = Depends(get_db)) -> list[IssueCommentOut]:
    """Return all comments for a given issue in chronological order."""
    rows = repo.list_comments(db, issue_id)
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
    """Add a new comment to an existing issue."""
    issue = repo.get(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    comment = repo.add_comment(
        db,
        id=new_id("ic"),
        issue_id=issue_id,
        user_id=payload.user_id,
        message=payload.message,
    )
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
    """Return aggregate counts of issues grouped by status, type, and priority."""
    all_issues = repo.list_all(db)
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
