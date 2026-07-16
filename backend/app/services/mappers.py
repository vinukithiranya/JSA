from app.models.db_models import DocumentDB, TemplateDB
from app.schemas.models import DocumentOut, TemplateOut


def to_template_out(record: TemplateDB) -> TemplateOut:
    """Convert a TemplateDB database record to a TemplateOut schema object."""
    return TemplateOut(
        id=record.id,
        name=record.name,
        category=record.category,
        description=record.description,
        form_schema=record.form_schema or {},
    )


def to_document_out(record: DocumentDB) -> DocumentOut:
    """Convert a DocumentDB database record to a DocumentOut schema object."""
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
