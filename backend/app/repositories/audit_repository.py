from sqlalchemy.orm import Session

from app.models.db_models import AuditLogDB


def create(db: Session, **fields) -> AuditLogDB:
    """Create and persist a new audit log entry."""
    row = AuditLogDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session) -> list[AuditLogDB]:
    """Return all audit log entries."""
    return db.query(AuditLogDB).all()
