from pathlib import Path, PurePosixPath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import documents_repository as repo
from app.schemas.models import DocumentOut
from app.services.mappers import to_document_out
from app.services.store import new_id

router = APIRouter()


def _safe_path_segment(value: str, default: str) -> str:
    """Reduce a client-supplied path segment to a single safe filename/foldername component."""
    cleaned = PurePosixPath(value.replace("\\", "/")).name
    return cleaned or default


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
) -> list[DocumentOut]:
    """Return all non-archived documents ordered by upload date descending."""
    records = repo.list_active(db)
    return [to_document_out(item) for item in records]


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("SOP"),
    folder: str = Form("General"),
    description: str = Form(""),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Save an uploaded file to storage and create a corresponding database record."""
    safe_folder = _safe_path_segment(folder, "General")
    safe_original_name = _safe_path_segment(file.filename or "upload", "upload")

    docs_dir = Path("storage") / "documents" / safe_folder
    docs_dir.mkdir(parents=True, exist_ok=True)

    doc_id = new_id("doc")
    safe_name = f"{doc_id}_{safe_original_name}"
    target = docs_dir / safe_name

    content = await file.read()
    target.write_bytes(content)

    record = repo.create(
        db,
        id=doc_id,
        filename=safe_name,
        original_filename=safe_original_name,
        file_path=str(target),
        category=category,
        folder=safe_folder,
        description=description,
        version=1,
        uploaded_by="u-admin",
    )

    return to_document_out(record)


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Stream a document's file content."""
    document = repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    file_path = Path(document.file_path)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(str(file_path), filename=document.original_filename)


@router.patch("/{document_id}/update-version", response_model=DocumentOut)
def update_document_version(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Increment the version number of the specified document by one."""
    document = repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    document.version += 1
    db.commit()
    db.refresh(document)
    return document


@router.patch("/{document_id}/add-tags", response_model=DocumentOut)
def add_document_tags(
    document_id: str,
    tags: list[str],
    db: Session = Depends(get_db),
):
    """Append the provided tags to the specified document's tag list."""
    document = repo.get(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    document.tags.extend(tags)
    db.commit()
    db.refresh(document)
    return document
