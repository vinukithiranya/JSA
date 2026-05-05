from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import JsaRecordDB

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db)) -> dict:
    records = db.query(JsaRecordDB).all()
    total = len(records)
    pending = len([r for r in records if r.status == "pending_approval"])
    approved = len([r for r in records if r.status == "approved"])
    drafts = len([r for r in records if r.status == "draft"])

    completion_rate = 0 if total == 0 else round((approved / total) * 100, 2)
    avg_risk = 0
    if records:
        scores: list[int] = []
        for record in records:
            for hazard in (record.hazards or []):
                score = int(hazard.get("pre_score", 0))
                if score > 0:
                    scores.append(score)
        avg_risk = 0 if not scores else round(sum(scores) / len(scores), 2)

    return {
        "kpi": {
            "total_jsa": total,
            "pending_approval": pending,
            "approved": approved,
            "drafts": drafts,
            "completion_rate": completion_rate,
            "avg_risk_score": avg_risk,
        },
        "status_breakdown": [
            {"status": "draft", "count": drafts},
            {"status": "pending_approval", "count": pending},
            {"status": "approved", "count": approved},
        ],
    }
