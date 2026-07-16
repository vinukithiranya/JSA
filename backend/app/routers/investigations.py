import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.repositories import investigations_repository as repo

router = APIRouter()

class InvestigationIn(BaseModel):
    """Schema for creating or updating an investigation record."""
    title: str
    incident_date: str
    incident_type: str = "near_miss"
    severity: str = "medium"
    site: str = ""
    description: str = ""
    involved_parties: list = []
    immediate_actions: str = ""
    root_causes: list = []
    corrective_actions: list = []
    media_urls: list = []
    linked_issue_id: str | None = None
    linked_inspection_id: str | None = None
    status: str = "open"
    created_by: str = "u-admin"

@router.get("")
def list_investigations(db: Session = Depends(get_db)):
    """Return all investigations ordered by creation date descending."""
    return repo.list_all(db)

@router.post("")
def create_investigation(body: InvestigationIn, db: Session = Depends(get_db)):
    """Create a new investigation record and persist it to the database."""
    data = body.model_dump()
    data["incident_date"] = date.fromisoformat(data["incident_date"])
    return repo.create(db, id=f"inv-{uuid.uuid4().hex[:12]}", **data)

@router.get("/{inv_id}")
def get_investigation(inv_id: str, db: Session = Depends(get_db)):
    """Retrieve a single investigation by its ID."""
    inv = repo.get(db, inv_id)
    if not inv: raise HTTPException(404, "Investigation not found")
    return inv

@router.put("/{inv_id}")
def update_investigation(inv_id: str, body: InvestigationIn, db: Session = Depends(get_db)):
    """Update an existing investigation record with the provided data."""
    inv = repo.get(db, inv_id)
    if not inv: raise HTTPException(404, "Investigation not found")
    data = body.model_dump()
    data["incident_date"] = date.fromisoformat(data["incident_date"])
    for k, v in data.items(): setattr(inv, k, v)
    db.commit(); db.refresh(inv)
    return inv
