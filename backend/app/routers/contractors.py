import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.db_models import ContractorDB

router = APIRouter()

class ContractorIn(BaseModel):
    company_name: str
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    abn: str = ""
    status: str = "active"
    trade_type: str = ""
    site: str = ""
    documents: list = []
    notes: str = ""

@router.get("")
def list_contractors(db: Session = Depends(get_db)):
    return db.query(ContractorDB).order_by(ContractorDB.created_at.desc()).all()

@router.post("")
def create_contractor(body: ContractorIn, db: Session = Depends(get_db)):
    c = ContractorDB(id=f"ctr-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.get("/{contractor_id}")
def get_contractor(contractor_id: str, db: Session = Depends(get_db)):
    c = db.query(ContractorDB).filter(ContractorDB.id == contractor_id).first()
    if not c: raise HTTPException(404, "Contractor not found")
    return c

@router.put("/{contractor_id}")
def update_contractor(contractor_id: str, body: ContractorIn, db: Session = Depends(get_db)):
    c = db.query(ContractorDB).filter(ContractorDB.id == contractor_id).first()
    if not c: raise HTTPException(404, "Contractor not found")
    for k, v in body.model_dump().items(): setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c

@router.delete("/{contractor_id}")
def delete_contractor(contractor_id: str, db: Session = Depends(get_db)):
    c = db.query(ContractorDB).filter(ContractorDB.id == contractor_id).first()
    if not c: raise HTTPException(404, "Contractor not found")
    db.delete(c); db.commit()
    return {"ok": True}
