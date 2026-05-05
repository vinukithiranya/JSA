from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import JsaRecordDB
from app.schemas.models import SyncBatchRequest
from app.services.hazard_engine import detect_hazards
from app.services.store import new_id

router = APIRouter()


@router.post("/jsa-batch")
def sync_jsa_batch(payload: SyncBatchRequest, db: Session = Depends(get_db)) -> dict:
    inserted = 0

    for item in payload.items:
        hazards, ppe_list = detect_hazards(item.steps, item.answers)
        record = JsaRecordDB(
            id=new_id("jsa"),
            job_number=item.job_number,
            boat_name=item.boat_name,
            service_log_number=item.service_log_number,
            location=item.location,
            date=item.date,
            work_steps=item.steps,
            questionnaire_answers=item.answers,
            hazards=[h.model_dump() for h in hazards],
            ppe_list=ppe_list,
            status="pending_approval",
            created_by=payload.created_by,
        )
        db.add(record)
        inserted += 1

    db.commit()
    return {"synced": inserted}
