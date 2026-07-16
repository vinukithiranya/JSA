from sqlalchemy.orm import Session

from app.models.db_models import HeadsUpDB


def create(db: Session, **fields) -> HeadsUpDB:
    """Create and persist a new heads-up notification."""
    row = HeadsUpDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_active(db: Session) -> list[HeadsUpDB]:
    """Return all active heads-up notifications ordered by creation date descending."""
    return db.query(HeadsUpDB).filter(HeadsUpDB.is_active == True).order_by(HeadsUpDB.created_at.desc()).all()  # noqa: E712


def get(db: Session, hu_id: str) -> HeadsUpDB | None:
    """Return a heads-up notification by ID, or None if not found."""
    return db.query(HeadsUpDB).filter(HeadsUpDB.id == hu_id).first()
