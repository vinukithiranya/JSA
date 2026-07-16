from sqlalchemy.orm import Session

from app.models.db_models import InvestigationDB


def create(db: Session, **fields) -> InvestigationDB:
    """Create and persist a new investigation."""
    row = InvestigationDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session) -> list[InvestigationDB]:
    """Return all investigations ordered by creation date descending."""
    return db.query(InvestigationDB).order_by(InvestigationDB.created_at.desc()).all()


def get(db: Session, investigation_id: str) -> InvestigationDB | None:
    """Return an investigation by ID, or None if not found."""
    return db.query(InvestigationDB).filter(InvestigationDB.id == investigation_id).first()
