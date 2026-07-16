from sqlalchemy.orm import Session

from app.repositories import notifications_repository, users_repository
from app.services.store import new_id


def notify(db: Session, user_id: str, message: str, event_type: str = "info", link: str = "") -> None:
    """Create and persist a notification for a specific user."""
    notifications_repository.create(
        db,
        id=new_id("ntf"),
        user_id=user_id,
        message=message,
        event_type=event_type,
        link=link,
    )


def notify_supervisors(db: Session, message: str, event_type: str = "info", link: str = "") -> None:
    """Send a notification to all users with supervisor or admin roles."""
    for sup in users_repository.list_supervisors_and_admins(db):
        notify(db, sup.id, message, event_type, link)
