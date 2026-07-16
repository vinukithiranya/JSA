from sqlalchemy.orm import Session

from app.models.db_models import TemplateDB


def create(db: Session, **fields) -> TemplateDB:
    """Create and persist a new template."""
    row = TemplateDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_active(db: Session) -> list[TemplateDB]:
    """Return all active templates ordered by creation date descending."""
    return db.query(TemplateDB).filter(TemplateDB.is_active.is_(True)).order_by(TemplateDB.created_at.desc()).all()


def get_active(db: Session, template_id: str) -> TemplateDB | None:
    """Return a single active template by ID, or None if not found."""
    return db.query(TemplateDB).filter(TemplateDB.id == template_id, TemplateDB.is_active.is_(True)).first()


def get_by_id(db: Session, template_id: str) -> TemplateDB | None:
    """Return a template by ID regardless of active status, or None if not found."""
    return db.query(TemplateDB).filter(TemplateDB.id == template_id).first()


def archive(db: Session, row: TemplateDB) -> None:
    """Mark a template as inactive."""
    row.is_active = False
