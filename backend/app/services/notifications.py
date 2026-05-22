from sqlalchemy.orm import Session

from app.models.db_models import NotificationDB, UserDB
from app.services.store import new_id


def notify(db: Session, user_id: str, message: str, event_type: str = "info", link: str = "") -> None:
    db.add(NotificationDB(
        id=new_id("ntf"),
        user_id=user_id,
        message=message,
        event_type=event_type,
        link=link,
    ))


def notify_supervisors(db: Session, message: str, event_type: str = "info", link: str = "") -> None:
    supervisors = db.query(UserDB).filter(UserDB.role.in_(["supervisor", "admin"])).all()
    for sup in supervisors:
        notify(db, sup.id, message, event_type, link)
