from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import JsaRecordDB

router = APIRouter()


@router.get("/jsa/analytics")
def jsa_analytics(db: Session = Depends(get_db)):
    records = db.query(JsaRecordDB).all()
    counts = {}
    total_pre = {}
    total_post = {}
    occurrences = {}

    for r in records:
        for h in (r.hazards or []):
            hid = int(h.get("hazard_id"))
            counts[hid] = counts.get(hid, 0) + 1
            total_pre[hid] = total_pre.get(hid, 0) + int(h.get("pre_score", 0) or 0)
            total_post[hid] = total_post.get(hid, 0) + int(h.get("post_score", 0) or 0)
            occurrences[hid] = occurrences.get(hid, 0) + 1

    analytics = {}
    for hid, cnt in counts.items():
        analytics[hid] = {
            "count": cnt,
            "avg_pre_score": (total_pre.get(hid, 0) / occurrences.get(hid, 1)),
            "avg_post_score": (total_post.get(hid, 0) / occurrences.get(hid, 1)),
        }

    return {"total_jsas": len(records), "by_hazard": analytics}
