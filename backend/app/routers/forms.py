from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import TemplateDB
from app.schemas.models import TemplateCreate, TemplateOut
from app.services.mappers import to_template_out
from app.services.store import new_id

router = APIRouter()


@router.get("", response_model=list[TemplateOut])
def list_forms(db: Session = Depends(get_db)) -> list[TemplateOut]:
    records = db.query(TemplateDB).order_by(TemplateDB.created_at.desc()).all()
    return [to_template_out(item) for item in records]


@router.post("", response_model=TemplateOut)
def create_form(payload: TemplateCreate, db: Session = Depends(get_db)) -> TemplateOut:
    record = TemplateDB(
        id=new_id("form"),
        name=payload.name,
        category=payload.category,
        description=payload.description,
        form_schema=payload.form_schema,
        created_by="u-admin",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return to_template_out(record)
