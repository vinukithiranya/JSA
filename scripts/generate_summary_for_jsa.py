from app.core.db import SessionLocal
from app.models.db_models import JsaRecordDB
from app.services.mappers import to_jsa_out
from app.services.hazard_engine import detect_hazards
from app.services.summary_service import build_summary, save_summary_files


def run(jsa_id: str):
    """Fetch a JSA record by ID, detect hazards if needed, build a summary, and save the output files."""
    with SessionLocal() as db:
        record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
        if not record:
            print('JSA not found')
            return
        jsa_out = to_jsa_out(record)
        if not (jsa_out.hazards and len(jsa_out.hazards) > 0):
            hazards, ppe_list = detect_hazards(jsa_out.steps or [], jsa_out.answers or {})
            jsa_out.hazards = hazards
            jsa_out.ppe_list = ppe_list

        summary = build_summary(jsa_out)
        json_path, csv_path = save_summary_files(jsa_out, summary)
        record.summary_json_url = json_path
        record.summary_csv_url = csv_path
        db.commit()
        print('Generated', json_path, csv_path)


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python generate_summary_for_jsa.py <jsa_id>')
    else:
        run(sys.argv[1])
