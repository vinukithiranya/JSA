from sqlalchemy.orm import Session

from app.models.db_models import ContractorDB


def create(db: Session, **fields) -> ContractorDB:
    """Create and persist a new contractor."""
    row = ContractorDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session) -> list[ContractorDB]:
    """Return all contractors ordered by creation date descending."""
    return db.query(ContractorDB).order_by(ContractorDB.created_at.desc()).all()


def get(db: Session, contractor_id: str) -> ContractorDB | None:
    """Return a contractor by ID, or None if not found."""
    return db.query(ContractorDB).filter(ContractorDB.id == contractor_id).first()


def delete(db: Session, row: ContractorDB) -> None:
    """Delete the given contractor row."""
    db.delete(row)
