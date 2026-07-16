import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.repositories import contractors_repository as repo

router = APIRouter()

class ContractorIn(BaseModel):
    """Schema for creating or updating a contractor."""

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
    """Return all contractors ordered by creation date descending."""
    return repo.list_all(db)

@router.post("")
def create_contractor(body: ContractorIn, db: Session = Depends(get_db)):
    """Create and persist a new contractor record."""
    return repo.create(db, id=f"ctr-{uuid.uuid4().hex[:12]}", **body.model_dump())

@router.get("/{contractor_id}")
def get_contractor(contractor_id: str, db: Session = Depends(get_db)):
    """Retrieve a single contractor by ID or raise 404 if not found."""
    c = repo.get(db, contractor_id)
    if not c: raise HTTPException(404, "Contractor not found")
    return c

@router.put("/{contractor_id}")
def update_contractor(contractor_id: str, body: ContractorIn, db: Session = Depends(get_db)):
    """Update an existing contractor's fields or raise 404 if not found."""
    c = repo.get(db, contractor_id)
    if not c: raise HTTPException(404, "Contractor not found")
    for k, v in body.model_dump().items(): setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c

@router.delete("/{contractor_id}")
def delete_contractor(contractor_id: str, db: Session = Depends(get_db)):
    """Delete a contractor by ID or raise 404 if not found."""
    c = repo.get(db, contractor_id)
    if not c: raise HTTPException(404, "Contractor not found")
    repo.delete(db, c); db.commit()
    return {"ok": True}
