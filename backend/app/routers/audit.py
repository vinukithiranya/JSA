from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import AuditLogDB
from app.schemas.models import AuditLogCreate, AuditLogOut

router = APIRouter()


@router.post("/audit-logs", response_model=AuditLogOut)
def create_audit_log(audit_log: AuditLogCreate, db: Session = Depends(get_db)):
    new_log = AuditLogDB(**audit_log.dict())
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLogDB).all()