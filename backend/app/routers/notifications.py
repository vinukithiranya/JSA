from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import notifications_repository as repo
from app.schemas.models import NotificationCreate, NotificationOut
from app.services.store import new_id

router = APIRouter()


def _to_out(row) -> NotificationOut:
    """Convert a NotificationDB row to a NotificationOut schema object."""
    return NotificationOut(
        id=row.id,
        user_id=row.user_id,
        message=row.message,
        event_type=getattr(row, "event_type", "info") or "info",
        link=getattr(row, "link", "") or "",
        is_read=row.is_read,
        created_at=row.created_at,
    )


@router.post("", response_model=NotificationOut)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)) -> NotificationOut:
    """Create and persist a new notification record."""
    row = repo.create(
        db,
        id=new_id("ntf"),
        user_id=payload.user_id,
        message=payload.message,
        event_type=payload.event_type,
        link=payload.link,
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    """Return the 50 most recent notifications for the given user."""
    rows = repo.list_for_user(db, user_id, limit=50)
    return [_to_out(r) for r in rows]


@router.get("/unread-count")
def unread_count(user_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    """Return the count of unread notifications for the given user."""
    return {"count": repo.unread_count(db, user_id)}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, db: Session = Depends(get_db)) -> NotificationOut:
    """Mark a single notification as read and return the updated record."""
    row = repo.get(db, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/mark-all-read")
def mark_all_read(user_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    """Mark all unread notifications for the given user as read."""
    repo.mark_all_read(db, user_id)
    db.commit()
    return {"ok": True}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: str, db: Session = Depends(get_db)) -> None:
    """Delete a notification by its ID."""
    row = repo.get(db, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    repo.delete(db, row)
    db.commit()
