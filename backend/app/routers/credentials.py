import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.db_models import CredentialDB

router = APIRouter()

class CredentialIn(BaseModel):
    user_id: str
    user_name: str = ""
    credential_type: str
    credential_number: str = ""
    issuing_authority: str = ""
    issued_date: str | None = None
    expiry_date: str | None = None
    file_url: str | None = None
    notes: str = ""

@router.get("")
def list_credentials(db: Session = Depends(get_db)):
    return db.query(CredentialDB).order_by(CredentialDB.expiry_date.asc()).all()

@router.post("")
def create_credential(body: CredentialIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    if data.get("issued_date"): data["issued_date"] = date.fromisoformat(data["issued_date"])
    if data.get("expiry_date"): data["expiry_date"] = date.fromisoformat(data["expiry_date"])
    c = CredentialDB(id=f"crd-{uuid.uuid4().hex[:12]}", **data)
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.put("/{cred_id}")
def update_credential(cred_id: str, body: CredentialIn, db: Session = Depends(get_db)):
    c = db.query(CredentialDB).filter(CredentialDB.id == cred_id).first()
    if not c: raise HTTPException(404, "Credential not found")
    data = body.model_dump()
    if data.get("issued_date"): data["issued_date"] = date.fromisoformat(data["issued_date"])
    if data.get("expiry_date"): data["expiry_date"] = date.fromisoformat(data["expiry_date"])
    for k, v in data.items(): setattr(c, k, v)
    db.commit(); db.refresh(c)
    return c

@router.delete("/{cred_id}")
def delete_credential(cred_id: str, db: Session = Depends(get_db)):
    c = db.query(CredentialDB).filter(CredentialDB.id == cred_id).first()
    if not c: raise HTTPException(404, "Credential not found")
    db.delete(c); db.commit()
    return {"ok": True}
