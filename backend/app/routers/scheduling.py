from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import schedules_repository as repo
from app.schemas.models import (
    OccurrenceComplete,
    OccurrenceOut,
    ScheduleCreate,
    ScheduleOut,
)
from app.services.store import new_id

router = APIRouter()


def _generate_occurrences(schedule, count: int = 8) -> list[date]:
    """Generate next N occurrence dates from today based on schedule frequency."""
    today = date.today()
    start = max(schedule.start_date, today)
    end = schedule.end_date
    dates: list[date] = []
    current = start

    for _ in range(count * 4):  # oversample to account for gaps
        if end and current > end:
            break
        if len(dates) >= count:
            break
        dates.append(current)
        if schedule.frequency == "daily":
            current = current + timedelta(days=schedule.frequency_value)
        elif schedule.frequency == "weekly":
            current = current + timedelta(weeks=schedule.frequency_value)
        elif schedule.frequency == "monthly":
            month = current.month + schedule.frequency_value
            year = current.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = min(current.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
            current = date(year, month, day)

    return dates


def _to_schedule_out(row) -> ScheduleOut:
    """Convert a ScheduleDB ORM row to a ScheduleOut response model."""
    return ScheduleOut(
        id=row.id,
        title=row.title,
        template_id=row.template_id,
        template_name=row.template_name or "",
        frequency=row.frequency,
        frequency_value=row.frequency_value,
        start_date=row.start_date,
        end_date=row.end_date,
        site=row.site or "",
        assigned_users=row.assigned_users or [],
        is_active=row.is_active,
        created_by=row.created_by,
        created_at=row.created_at,
    )


def _to_occ_out(row) -> OccurrenceOut:
    """Convert a ScheduleOccurrenceDB ORM row to an OccurrenceOut response model."""
    return OccurrenceOut(
        id=row.id,
        schedule_id=row.schedule_id,
        schedule_title=row.schedule_title or "",
        due_date=row.due_date,
        status=row.status,
        completed_at=row.completed_at,
        completed_by=row.completed_by,
        jsa_id=row.jsa_id,
        created_at=row.created_at,
    )


# ─── Schedules ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[ScheduleOut])
def list_schedules(db: Session = Depends(get_db)) -> list[ScheduleOut]:
    """Return all schedules ordered by creation date descending."""
    rows = repo.list_schedules(db)
    return [_to_schedule_out(r) for r in rows]


@router.post("", response_model=ScheduleOut)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)) -> ScheduleOut:
    """Create a new schedule and pre-generate its first 8 occurrences."""
    row = repo.create_schedule(
        db,
        id=new_id("sch"),
        title=payload.title,
        template_id=payload.template_id,
        template_name=payload.template_name,
        frequency=payload.frequency,
        frequency_value=payload.frequency_value,
        start_date=payload.start_date,
        end_date=payload.end_date,
        site=payload.site,
        assigned_users=payload.assigned_users,
        is_active=True,
        created_by=payload.created_by,
    )

    # Pre-generate first 8 occurrences
    occ_dates = _generate_occurrences(row, count=8)
    for d in occ_dates:
        repo.add_occurrence(
            db,
            id=new_id("occ"),
            schedule_id=row.id,
            schedule_title=row.title,
            due_date=d,
            status="pending",
        )
    db.commit()

    return _to_schedule_out(row)


@router.get("/{schedule_id}", response_model=ScheduleOut)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)) -> ScheduleOut:
    """Retrieve a single schedule by its ID."""
    row = repo.get_schedule(db, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return _to_schedule_out(row)


@router.patch("/{schedule_id}/toggle", response_model=ScheduleOut)
def toggle_schedule(schedule_id: str, db: Session = Depends(get_db)) -> ScheduleOut:
    """Toggle the active status of a schedule."""
    row = repo.get_schedule(db, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    row.is_active = not row.is_active
    db.commit()
    db.refresh(row)
    return _to_schedule_out(row)


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)) -> None:
    """Delete a schedule and all its associated occurrences."""
    row = repo.get_schedule(db, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    repo.delete_occurrences_for_schedule(db, schedule_id)
    repo.delete_schedule(db, row)
    db.commit()


# ─── Occurrences ─────────────────────────────────────────────────────────────

@router.get("/{schedule_id}/occurrences", response_model=list[OccurrenceOut])
def list_occurrences(schedule_id: str, db: Session = Depends(get_db)) -> list[OccurrenceOut]:
    """Return all occurrences for a given schedule ordered by due date ascending."""
    rows = repo.list_occurrences(db, schedule_id)
    return [_to_occ_out(r) for r in rows]


@router.get("/occurrences/all", response_model=list[OccurrenceOut])
def list_all_occurrences(
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[OccurrenceOut]:
    """Return all occurrences across schedules, optionally filtered by status, marking overdue ones."""
    # Mark overdue occurrences
    today = date.today()
    rows = repo.list_all_occurrences(db, status=status)
    for r in rows:
        if r.status == "pending" and r.due_date < today:
            r.status = "overdue"
    db.commit()
    return [_to_occ_out(r) for r in rows]


@router.patch("/occurrences/{occ_id}/complete", response_model=OccurrenceOut)
def complete_occurrence(
    occ_id: str, payload: OccurrenceComplete, db: Session = Depends(get_db)
) -> OccurrenceOut:
    """Mark a schedule occurrence as completed with the given completion details."""
    row = repo.get_occurrence(db, occ_id)
    if not row:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    row.status = "completed"
    row.completed_at = datetime.now(timezone.utc)
    row.completed_by = payload.completed_by
    if payload.jsa_id:
        row.jsa_id = payload.jsa_id
    db.commit()
    db.refresh(row)
    return _to_occ_out(row)


@router.patch("/occurrences/{occ_id}/miss", response_model=OccurrenceOut)
def miss_occurrence(occ_id: str, db: Session = Depends(get_db)) -> OccurrenceOut:
    """Mark a schedule occurrence as missed."""
    row = repo.get_occurrence(db, occ_id)
    if not row:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    row.status = "missed"
    db.commit()
    db.refresh(row)
    return _to_occ_out(row)
