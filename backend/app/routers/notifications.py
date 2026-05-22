from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import NotificationDB
from app.schemas.models import NotificationCreate, NotificationOut
from app.services.store import new_id

router = APIRouter()


def _to_out(row: NotificationDB) -> NotificationOut:
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
    row = NotificationDB(
        id=new_id("ntf"),
        user_id=payload.user_id,
        message=payload.message,
        event_type=payload.event_type,
        link=payload.link,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    rows = (
        db.query(NotificationDB)
        .filter(NotificationDB.user_id == user_id)
        .order_by(NotificationDB.created_at.desc())
        .limit(50)
        .all()
    )
    return [_to_out(r) for r in rows]


@router.get("/unread-count")
def unread_count(user_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    count = (
        db.query(NotificationDB)
        .filter(NotificationDB.user_id == user_id, NotificationDB.is_read == False)  # noqa: E712
        .count()
    )
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, db: Session = Depends(get_db)) -> NotificationOut:
    row = db.query(NotificationDB).filter(NotificationDB.id == notification_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/mark-all-read")
def mark_all_read(user_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    db.query(NotificationDB).filter(
        NotificationDB.user_id == user_id,
        NotificationDB.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: str, db: Session = Depends(get_db)) -> None:
    row = db.query(NotificationDB).filter(NotificationDB.id == notification_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(row)
    db.commit()
