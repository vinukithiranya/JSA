from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import audit_repository as repo
from app.schemas.models import AuditLogCreate, AuditLogOut
from app.services.store import new_id

router = APIRouter()


@router.post("/audit-logs", response_model=AuditLogOut)
def create_audit_log(audit_log: AuditLogCreate, db: Session = Depends(get_db)):
    """Create and persist a new audit log entry."""
    return repo.create(db, id=new_id("aud"), **audit_log.dict())


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(db: Session = Depends(get_db)):
    """Return all audit log entries from the database."""
    return repo.list_all(db)
