from sqlalchemy.orm import Session

from app.models.db_models import NotificationDB


def create(db: Session, **fields) -> NotificationDB:
    """Create (without committing) a new notification row."""
    row = NotificationDB(**fields)
    db.add(row)
    return row


def list_for_user(db: Session, user_id: str, limit: int = 50) -> list[NotificationDB]:
    """Return the most recent notifications for a user."""
    return (
        db.query(NotificationDB)
        .filter(NotificationDB.user_id == user_id)
        .order_by(NotificationDB.created_at.desc())
        .limit(limit)
        .all()
    )


def unread_count(db: Session, user_id: str) -> int:
    """Return the count of unread notifications for a user."""
    return (
        db.query(NotificationDB)
        .filter(NotificationDB.user_id == user_id, NotificationDB.is_read == False)  # noqa: E712
        .count()
    )


def get(db: Session, notification_id: str) -> NotificationDB | None:
    """Return a notification by ID, or None if not found."""
    return db.query(NotificationDB).filter(NotificationDB.id == notification_id).first()


def mark_all_read(db: Session, user_id: str) -> None:
    """Mark all unread notifications for a user as read."""
    db.query(NotificationDB).filter(
        NotificationDB.user_id == user_id,
        NotificationDB.is_read == False,  # noqa: E712
    ).update({"is_read": True})


def delete(db: Session, row: NotificationDB) -> None:
    """Delete the given notification row."""
    db.delete(row)
