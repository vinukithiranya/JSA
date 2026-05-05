from app.core.db import SessionLocal
from app.models.db_models import JsaRecordDB

with SessionLocal() as db:
    r = db.query(JsaRecordDB).filter(JsaRecordDB.id=='jsa-bbe8eedd').first()
    if r:
        print('json=', r.summary_json_url)
        print('csv=', r.summary_csv_url)
    else:
        print('record not found')
