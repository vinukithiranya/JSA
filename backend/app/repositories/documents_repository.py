from sqlalchemy.orm import Session

from app.models.db_models import DocumentDB


def create(db: Session, **fields) -> DocumentDB:
    """Create and persist a new document record."""
    row = DocumentDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_active(db: Session) -> list[DocumentDB]:
    """Return all non-archived documents ordered by upload date descending."""
    return db.query(DocumentDB).filter(DocumentDB.is_archived.is_(False)).order_by(DocumentDB.upload_date.desc()).all()


def get(db: Session, document_id: str) -> DocumentDB | None:
    """Return a document by ID, or None if not found."""
    return db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
