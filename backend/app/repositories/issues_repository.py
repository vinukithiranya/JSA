from sqlalchemy.orm import Session

from app.models.db_models import IssueCommentDB, IssueDB


def create(db: Session, **fields) -> IssueDB:
    """Create and flush a new issue row (caller controls the commit)."""
    row = IssueDB(**fields)
    db.add(row)
    db.flush()
    return row


def list_all(
    db: Session,
    status: str | None = None,
    priority: str | None = None,
    issue_type: str | None = None,
) -> list[IssueDB]:
    """Return issues ordered by creation date descending, optionally filtered."""
    q = db.query(IssueDB)
    if status:
        q = q.filter(IssueDB.status == status)
    if priority:
        q = q.filter(IssueDB.priority == priority)
    if issue_type:
        q = q.filter(IssueDB.issue_type == issue_type)
    return q.order_by(IssueDB.created_at.desc()).all()


def get(db: Session, issue_id: str) -> IssueDB | None:
    """Return an issue by ID, or None if not found."""
    return db.query(IssueDB).filter(IssueDB.id == issue_id).first()


def get_by_id_or_none(db: Session, issue_id: str) -> IssueDB | None:
    """Return an issue by ID using filter_by, used by upsert-style sync flows."""
    return db.query(IssueDB).filter_by(id=issue_id).first()


def delete(db: Session, row: IssueDB) -> None:
    """Delete the given issue row."""
    db.delete(row)


def list_comments(db: Session, issue_id: str) -> list[IssueCommentDB]:
    """Return all comments for an issue in chronological order."""
    return (
        db.query(IssueCommentDB)
        .filter(IssueCommentDB.issue_id == issue_id)
        .order_by(IssueCommentDB.created_at.asc())
        .all()
    )


def add_comment(db: Session, **fields) -> IssueCommentDB:
    """Create and persist a new issue comment."""
    row = IssueCommentDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
