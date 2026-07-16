from sqlalchemy.orm import Session

from app.models.db_models import CredentialDB


def create(db: Session, **fields) -> CredentialDB:
    """Create and persist a new credential."""
    row = CredentialDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session) -> list[CredentialDB]:
    """Return all credentials ordered by expiry date ascending."""
    return db.query(CredentialDB).order_by(CredentialDB.expiry_date.asc()).all()


def get(db: Session, credential_id: str) -> CredentialDB | None:
    """Return a credential by ID, or None if not found."""
    return db.query(CredentialDB).filter(CredentialDB.id == credential_id).first()


def delete(db: Session, row: CredentialDB) -> None:
    """Delete the given credential row."""
    db.delete(row)
