from sqlalchemy.orm import Session

from app.models.db_models import ActionCommentDB, ActionDB


def create(db: Session, **fields) -> ActionDB:
    """Create and flush a new action row (caller controls the commit)."""
    row = ActionDB(**fields)
    db.add(row)
    db.flush()
    return row


def list_all(db: Session, status: str | None = None, priority: str | None = None) -> list[ActionDB]:
    """Return actions ordered by creation date descending, optionally filtered."""
    q = db.query(ActionDB)
    if status:
        q = q.filter(ActionDB.status == status)
    if priority:
        q = q.filter(ActionDB.priority == priority)
    return q.order_by(ActionDB.created_at.desc()).all()


def get(db: Session, action_id: str) -> ActionDB | None:
    """Return an action by ID, or None if not found."""
    return db.query(ActionDB).filter(ActionDB.id == action_id).first()


def delete(db: Session, row: ActionDB) -> None:
    """Delete the given action row."""
    db.delete(row)


def list_comments(db: Session, action_id: str) -> list[ActionCommentDB]:
    """Return all comments for an action in chronological order."""
    return (
        db.query(ActionCommentDB)
        .filter(ActionCommentDB.action_id == action_id)
        .order_by(ActionCommentDB.created_at.asc())
        .all()
    )


def add_comment(db: Session, **fields) -> ActionCommentDB:
    """Create and persist a new action comment."""
    row = ActionCommentDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
