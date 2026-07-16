import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.repositories import headsup_repository as repo

router = APIRouter()

class HeadsUpIn(BaseModel):
    """Schema for creating a new heads-up notification."""
    title: str
    body: str = ""
    author_id: str = "u-admin"
    author_name: str = "Admin"
    sites: list = []
    attachments: list = []

class AckIn(BaseModel):
    """Schema for acknowledging a heads-up notification."""
    user_id: str

@router.get("")
def list_headsup(db: Session = Depends(get_db)):
    """Return all active heads-up notifications ordered by creation date descending."""
    return repo.list_active(db)

@router.post("")
def create_headsup(body: HeadsUpIn, db: Session = Depends(get_db)):
    """Create and persist a new heads-up notification."""
    return repo.create(db, id=f"hu-{uuid.uuid4().hex[:12]}", **body.model_dump())

@router.post("/{hu_id}/acknowledge")
def acknowledge(hu_id: str, body: AckIn, db: Session = Depends(get_db)):
    """Record a user's acknowledgment of the specified heads-up notification."""
    h = repo.get(db, hu_id)
    if not h: raise HTTPException(404, "Not found")
    acks = list(h.acknowledgments or [])
    if body.user_id not in acks:
        acks.append(body.user_id)
        h.acknowledgments = acks
        db.commit()
    return h

@router.delete("/{hu_id}")
def delete_headsup(hu_id: str, db: Session = Depends(get_db)):
    """Soft-delete a heads-up notification by marking it inactive."""
    h = repo.get(db, hu_id)
    if not h: raise HTTPException(404, "Not found")
    h.is_active = False
    db.commit()
    return {"ok": True}
