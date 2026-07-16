from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import templates_repository as repo
from app.schemas.models import TemplateCreate, TemplateOut, TemplateUpdate
from app.services.mappers import to_template_out
from app.services.store import new_id

router = APIRouter()


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)) -> list[TemplateOut]:
    """Return all active templates ordered by creation date descending."""
    records = repo.list_active(db)
    return [to_template_out(item) for item in records]


@router.post("", response_model=TemplateOut)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db)) -> TemplateOut:
    """Create and persist a new template from the provided payload."""
    record = repo.create(
        db,
        id=new_id("tpl"),
        name=payload.name,
        category=payload.category,
        description=payload.description,
        form_schema=payload.form_schema,
        created_by="u-admin",
        is_active=True,
    )
    return to_template_out(record)


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)) -> TemplateOut:
    """Retrieve a single active template by its ID."""
    record = repo.get_active(db, template_id)
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")
    return to_template_out(record)


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: str, payload: TemplateUpdate, db: Session = Depends(get_db)) -> TemplateOut:
    """Update the specified fields of an existing active template."""
    record = repo.get_active(db, template_id)
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.name is not None:
        record.name = payload.name
    if payload.category is not None:
        record.category = payload.category
    if payload.description is not None:
        record.description = payload.description
    if payload.form_schema is not None:
        record.form_schema = payload.form_schema
    db.commit()
    db.refresh(record)
    return to_template_out(record)


@router.delete("/{template_id}", response_model=dict)
def archive_template(template_id: str, db: Session = Depends(get_db)) -> dict:
    """Soft-delete a template by marking it as inactive."""
    record = repo.get_by_id(db, template_id)
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")
    repo.archive(db, record)
    db.commit()
    return {"ok": True}


@router.post("/{template_id}/duplicate", response_model=TemplateOut)
def duplicate_template(template_id: str, db: Session = Depends(get_db)) -> TemplateOut:
    """Create a copy of an existing active template with a new ID."""
    original = repo.get_active(db, template_id)
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")
    copy = repo.create(
        db,
        id=new_id("tpl"),
        name=f"Copy of {original.name}",
        category=original.category,
        description=original.description,
        form_schema=original.form_schema,
        created_by="u-admin",
        is_active=True,
    )
    return to_template_out(copy)
