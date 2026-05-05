from app.core.db import SessionLocal
from app.models.db_models import JsaRecordDB
from pathlib import Path
import json

OUT = Path('storage/analytics')
OUT.mkdir(parents=True, exist_ok=True)

with SessionLocal() as db:
    records = db.query(JsaRecordDB).all()
    counts = {}
    total_pre = {}
    total_post = {}
    occ = {}

    for r in records:
        for h in (r.hazards or []):
            hid = int(h.get('hazard_id'))
            counts[hid] = counts.get(hid, 0) + 1
            total_pre[hid] = total_pre.get(hid, 0) + int(h.get('pre_score', 0) or 0)
            total_post[hid] = total_post.get(hid, 0) + int(h.get('post_score', 0) or 0)
            occ[hid] = occ.get(hid, 0) + 1

    analytics = {}
    for hid, cnt in counts.items():
        analytics[hid] = {
            'count': cnt,
            'avg_pre_score': (total_pre.get(hid, 0) / occ.get(hid, 1)),
            'avg_post_score': (total_post.get(hid, 0) / occ.get(hid, 1)),
        }

    out = {'total_jsas': len(records), 'by_hazard': analytics}
    (OUT / 'analytics.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
    print('Wrote', OUT / 'analytics.json')
