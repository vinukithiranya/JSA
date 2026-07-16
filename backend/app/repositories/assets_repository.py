from sqlalchemy.orm import Session

from app.models.db_models import AssetDB


def create(db: Session, **fields) -> AssetDB:
    """Create and persist a new asset."""
    row = AssetDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_all(db: Session) -> list[AssetDB]:
    """Return all assets ordered by creation date descending."""
    return db.query(AssetDB).order_by(AssetDB.created_at.desc()).all()


def get(db: Session, asset_id: str) -> AssetDB | None:
    """Return an asset by ID, or None if not found."""
    return db.query(AssetDB).filter(AssetDB.id == asset_id).first()


def delete(db: Session, row: AssetDB) -> None:
    """Delete the given asset row."""
    db.delete(row)
