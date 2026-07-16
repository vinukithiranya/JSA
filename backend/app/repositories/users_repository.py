from sqlalchemy.orm import Session

from app.models.db_models import UserDB


def get_by_id(db: Session, user_id: str) -> UserDB | None:
    """Return a user by ID, or None if not found."""
    return db.query(UserDB).filter(UserDB.id == user_id).first()


def get_by_email(db: Session, email: str) -> UserDB | None:
    """Return a user by email, or None if not found."""
    return db.query(UserDB).filter(UserDB.email == email).first()


def list_supervisors_and_admins(db: Session) -> list[UserDB]:
    """Return all users with the supervisor or admin role."""
    return db.query(UserDB).filter(UserDB.role.in_(["supervisor", "admin"])).all()
