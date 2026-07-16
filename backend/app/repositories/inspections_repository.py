from sqlalchemy.orm import Session

from app.models.db_models import InspectionRecordDB


def create(db: Session, **fields) -> InspectionRecordDB:
    """Create and persist a new inspection record."""
    row = InspectionRecordDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def add(db: Session, **fields) -> InspectionRecordDB:
    """Add a new inspection record without committing (caller controls the transaction)."""
    row = InspectionRecordDB(**fields)
    db.add(row)
    return row


def list_all(db: Session, status: str | None = None) -> list[InspectionRecordDB]:
    """Return inspections ordered by start time descending, optionally filtered by status."""
    q = db.query(InspectionRecordDB)
    if status:
        q = q.filter(InspectionRecordDB.status == status)
    return q.order_by(InspectionRecordDB.started_at.desc()).all()


def get(db: Session, inspection_id: str) -> InspectionRecordDB | None:
    """Return an inspection by ID, or None if not found."""
    return db.query(InspectionRecordDB).filter(InspectionRecordDB.id == inspection_id).first()


def get_by_id_or_none(db: Session, inspection_id: str) -> InspectionRecordDB | None:
    """Return an inspection by ID using filter_by, used by upsert-style sync flows."""
    return db.query(InspectionRecordDB).filter_by(id=inspection_id).first()


def delete(db: Session, row: InspectionRecordDB) -> None:
    """Delete the given inspection row."""
    db.delete(row)
