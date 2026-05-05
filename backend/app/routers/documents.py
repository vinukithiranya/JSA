from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import DocumentDB
from app.schemas.models import DocumentOut
from app.services.mappers import to_document_out
from app.services.store import new_id

router = APIRouter()


@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)) -> list[DocumentOut]:
    records = db.query(DocumentDB).filter(DocumentDB.is_archived.is_(False)).order_by(DocumentDB.upload_date.desc()).all()
    return [to_document_out(item) for item in records]


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("SOP"),
    folder: str = Form("General"),
    description: str = Form(""),
    db: Session = Depends(get_db),
) -> DocumentOut:
    docs_dir = Path("storage") / "documents" / folder
    docs_dir.mkdir(parents=True, exist_ok=True)

    doc_id = new_id("doc")
    safe_name = f"{doc_id}_{file.filename}"
    target = docs_dir / safe_name

    content = await file.read()
    target.write_bytes(content)

    record = DocumentDB(
        id=doc_id,
        filename=safe_name,
        original_filename=file.filename,
        file_path=str(target),
        category=category,
        folder=folder,
        description=description,
        version=1,
        uploaded_by="u-admin",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return to_document_out(record)
