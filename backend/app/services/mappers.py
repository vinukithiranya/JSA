from app.models.db_models import DocumentDB, JsaRecordDB, TemplateDB
from app.schemas.models import DocumentOut, HazardOut, JsaRecord, TemplateOut


def to_template_out(record: TemplateDB) -> TemplateOut:
    return TemplateOut(
        id=record.id,
        name=record.name,
        category=record.category,
        description=record.description,
        form_schema=record.form_schema or {},
    )


def to_jsa_out(record: JsaRecordDB) -> JsaRecord:
    hazards = [HazardOut(**item) for item in (record.hazards or [])]
    return JsaRecord(
        id=record.id,
        job_number=record.job_number,
        boat_name=record.boat_name,
        service_log_number=record.service_log_number,
        location=record.location,
        date=record.date,
        status=record.status,
        steps=record.work_steps or [],
        answers=record.questionnaire_answers or {},
        hazards=hazards,
        ppe_list=record.ppe_list or [],
        created_at=record.created_at,
    )


def to_document_out(record: DocumentDB) -> DocumentOut:
    return DocumentOut(
        id=record.id,
        filename=record.filename,
        original_filename=record.original_filename,
        file_path=record.file_path,
        category=record.category,
        folder=record.folder,
        description=record.description,
        version=record.version,
        uploaded_by=record.uploaded_by,
    )
