from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import NotificationDB
from app.schemas.models import NotificationCreate, NotificationOut

router = APIRouter()


@router.post("/notifications", response_model=NotificationOut)
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db)):
    new_notification = NotificationDB(**notification.dict())
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return new_notification


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(user_id: str = Query(...), db: Session = Depends(get_db)):
    return db.query(NotificationDB).filter(NotificationDB.user_id == user_id).all()


@router.patch("/notifications/{notification_id}", response_model=NotificationOut)
def mark_notification_as_read(notification_id: str, db: Session = Depends(get_db)):
    notification = db.query(NotificationDB).filter(NotificationDB.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification