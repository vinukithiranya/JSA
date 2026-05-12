from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, responses
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import JsaRecordDB
from app.schemas.models import AnalyzeResponse, JsaDraftCreate, JsaQuestionnaireUpdate, JsaRecord, JsaStepsUpdate
from app.services.hazard_engine import detect_hazards
from app.services.mappers import to_jsa_out
from app.services.pdf_service import generate_jsa_pdf
from app.services.summary_service import build_summary, save_summary_files
from app.services.store import new_id

router = APIRouter()


@router.get("", response_model=list[JsaRecord])
def list_jsa(db: Session = Depends(get_db)) -> list[JsaRecord]:
    records = db.query(JsaRecordDB).order_by(JsaRecordDB.created_at.desc()).all()
    return [to_jsa_out(item) for item in records]


@router.post("/draft", response_model=JsaRecord)
def create_draft(payload: JsaDraftCreate, db: Session = Depends(get_db)) -> JsaRecord:
    record = JsaRecordDB(
        id=new_id("jsa"),
        job_number=payload.job_number,
        boat_name=payload.boat_name,
        service_log_number=payload.service_log_number,
        location=payload.location,
        date=payload.date,
        status="draft",
        work_steps=[],
        questionnaire_answers={},
        hazards=[],
        ppe_list=[],
        created_by="u-tech",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return to_jsa_out(record)


@router.get("/{jsa_id}", response_model=JsaRecord)
def get_jsa(jsa_id: str, db: Session = Depends(get_db)) -> JsaRecord:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")
    return to_jsa_out(record)


@router.post("/{jsa_id}/steps", response_model=JsaRecord)
def update_steps(jsa_id: str, payload: JsaStepsUpdate, db: Session = Depends(get_db)) -> JsaRecord:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")
    record.work_steps = payload.steps
    db.commit()
    db.refresh(record)
    return to_jsa_out(record)


@router.post("/{jsa_id}/questionnaire", response_model=JsaRecord)
def update_questionnaire(jsa_id: str, payload: JsaQuestionnaireUpdate, db: Session = Depends(get_db)) -> JsaRecord:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")
    record.questionnaire_answers = payload.answers
    db.commit()
    db.refresh(record)
    return to_jsa_out(record)


@router.post("/{jsa_id}/analyze", response_model=AnalyzeResponse)
def analyze(jsa_id: str, db: Session = Depends(get_db)) -> AnalyzeResponse:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")

    hazards, ppe_list = detect_hazards(record.work_steps or [], record.questionnaire_answers or {})
    record.hazards = [item.model_dump() for item in hazards]
    record.ppe_list = ppe_list
    db.commit()

    return AnalyzeResponse(hazards=hazards, ppe_list=ppe_list)


@router.post("/{jsa_id}/submit", response_model=JsaRecord)
def submit(jsa_id: str, db: Session = Depends(get_db)) -> JsaRecord:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")

    record.status = "pending_approval"
    db.commit()
    db.refresh(record)
    return to_jsa_out(record)


@router.post("/{jsa_id}/approve", response_model=JsaRecord)
def approve(jsa_id: str, db: Session = Depends(get_db)) -> JsaRecord:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")

    record.status = "approved"
    record.approved_by = "u-sup"
    db.commit()
    db.refresh(record)
    return to_jsa_out(record)


@router.get("/{jsa_id}/report")
def get_report(jsa_id: str, db: Session = Depends(get_db)) -> FileResponse:
    record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="JSA not found")

    jsa_out = to_jsa_out(record)
    pdf_bytes = generate_jsa_pdf(jsa_out)

    reports_dir = Path("storage") / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    output_file = reports_dir / f"{record.id}.pdf"
    output_file.write_bytes(pdf_bytes)

    record.pdf_url = str(output_file)
    db.commit()

    return FileResponse(str(output_file), media_type="application/pdf", filename=f"JSA_{record.job_number}.pdf")


@router.get("/{jsa_id}/summary")
def get_summary(jsa_id: str, db: Session = Depends(get_db)):
    try:
        record = db.query(JsaRecordDB).filter(JsaRecordDB.id == jsa_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="JSA not found")

        jsa_out = to_jsa_out(record)
        # ensure hazards are populated
        if not (jsa_out.hazards and len(jsa_out.hazards) > 0):
            hazards, ppe_list = detect_hazards(jsa_out.steps or [], jsa_out.answers or {})
            jsa_out.hazards = hazards
            jsa_out.ppe_list = ppe_list

        summary = build_summary(jsa_out)
        json_path, csv_path = save_summary_files(jsa_out, summary)

        # update record with summary paths
        record.summary_json_url = json_path
        record.summary_csv_url = csv_path
        db.commit()
        db.refresh(record)

        return summary
    except Exception as exc:
        import traceback
        log_dir = Path("storage/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        tb = traceback.format_exc()
        (log_dir / f"summary_error_{jsa_id}.log").write_text(tb, encoding="utf-8")
        raise


