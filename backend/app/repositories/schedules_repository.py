from datetime import date

from sqlalchemy.orm import Session

from app.models.db_models import ScheduleDB, ScheduleOccurrenceDB


def create_schedule(db: Session, **fields) -> ScheduleDB:
    """Create and persist a new schedule."""
    row = ScheduleDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_schedules(db: Session) -> list[ScheduleDB]:
    """Return all schedules ordered by creation date descending."""
    return db.query(ScheduleDB).order_by(ScheduleDB.created_at.desc()).all()


def get_schedule(db: Session, schedule_id: str) -> ScheduleDB | None:
    """Return a schedule by ID, or None if not found."""
    return db.query(ScheduleDB).filter(ScheduleDB.id == schedule_id).first()


def delete_schedule(db: Session, row: ScheduleDB) -> None:
    """Delete the given schedule row."""
    db.delete(row)


def add_occurrence(db: Session, **fields) -> ScheduleOccurrenceDB:
    """Create (without committing) a new schedule occurrence."""
    row = ScheduleOccurrenceDB(**fields)
    db.add(row)
    return row


def delete_occurrences_for_schedule(db: Session, schedule_id: str) -> None:
    """Delete all occurrences belonging to a schedule."""
    db.query(ScheduleOccurrenceDB).filter(ScheduleOccurrenceDB.schedule_id == schedule_id).delete()


def list_occurrences(db: Session, schedule_id: str) -> list[ScheduleOccurrenceDB]:
    """Return all occurrences for a schedule ordered by due date ascending."""
    return (
        db.query(ScheduleOccurrenceDB)
        .filter(ScheduleOccurrenceDB.schedule_id == schedule_id)
        .order_by(ScheduleOccurrenceDB.due_date.asc())
        .all()
    )


def list_all_occurrences(db: Session, status: str | None = None) -> list[ScheduleOccurrenceDB]:
    """Return all occurrences across schedules ordered by due date ascending, optionally filtered."""
    q = db.query(ScheduleOccurrenceDB)
    if status:
        q = q.filter(ScheduleOccurrenceDB.status == status)
    return q.order_by(ScheduleOccurrenceDB.due_date.asc()).all()


def get_occurrence(db: Session, occ_id: str) -> ScheduleOccurrenceDB | None:
    """Return a schedule occurrence by ID, or None if not found."""
    return db.query(ScheduleOccurrenceDB).filter(ScheduleOccurrenceDB.id == occ_id).first()
