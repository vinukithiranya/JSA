import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.db_models import HeadsUpDB

router = APIRouter()

class HeadsUpIn(BaseModel):
    title: str
    body: str = ""
    author_id: str = "u-admin"
    author_name: str = "Admin"
    sites: list = []
    attachments: list = []

class AckIn(BaseModel):
    user_id: str

@router.get("")
def list_headsup(db: Session = Depends(get_db)):
    return db.query(HeadsUpDB).filter(HeadsUpDB.is_active == True).order_by(HeadsUpDB.created_at.desc()).all()

@router.post("")
def create_headsup(body: HeadsUpIn, db: Session = Depends(get_db)):
    h = HeadsUpDB(id=f"hu-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(h); db.commit(); db.refresh(h)
    return h

@router.post("/{hu_id}/acknowledge")
def acknowledge(hu_id: str, body: AckIn, db: Session = Depends(get_db)):
    h = db.query(HeadsUpDB).filter(HeadsUpDB.id == hu_id).first()
    if not h: raise HTTPException(404, "Not found")
    acks = list(h.acknowledgments or [])
    if body.user_id not in acks:
        acks.append(body.user_id)
        h.acknowledgments = acks
        db.commit()
    return h

@router.delete("/{hu_id}")
def delete_headsup(hu_id: str, db: Session = Depends(get_db)):
    h = db.query(HeadsUpDB).filter(HeadsUpDB.id == hu_id).first()
    if not h: raise HTTPException(404, "Not found")
    h.is_active = False
    db.commit()
    return {"ok": True}
