import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.repositories import assets_repository as repo

router = APIRouter()

class AssetIn(BaseModel):
    """Schema for creating or updating an asset."""
    name: str
    asset_number: str = ""
    asset_type: str = "Equipment"
    make: str = ""
    model_name: str = ""
    serial_number: str = ""
    site: str = ""
    status: str = "active"
    description: str = ""

class ReadingIn(BaseModel):
    """Schema for submitting a new asset reading."""
    reading_type: str
    value: float
    unit: str
    date: str

@router.get("")
def list_assets(db: Session = Depends(get_db)):
    """Return all assets ordered by creation date descending."""
    return repo.list_all(db)

@router.post("")
def create_asset(body: AssetIn, db: Session = Depends(get_db)):
    """Create a new asset and persist it to the database."""
    return repo.create(db, id=f"ast-{uuid.uuid4().hex[:12]}", **body.model_dump())

@router.get("/{asset_id}")
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    """Retrieve a single asset by its ID."""
    a = repo.get(db, asset_id)
    if not a: raise HTTPException(404, "Asset not found")
    return a

@router.put("/{asset_id}")
def update_asset(asset_id: str, body: AssetIn, db: Session = Depends(get_db)):
    """Update all fields of an existing asset."""
    a = repo.get(db, asset_id)
    if not a: raise HTTPException(404, "Asset not found")
    for k, v in body.model_dump().items(): setattr(a, k, v)
    db.commit(); db.refresh(a)
    return a

@router.delete("/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    """Delete an asset from the database by its ID."""
    a = repo.get(db, asset_id)
    if not a: raise HTTPException(404, "Asset not found")
    repo.delete(db, a); db.commit()
    return {"ok": True}

@router.post("/{asset_id}/readings")
def add_reading(asset_id: str, body: ReadingIn, db: Session = Depends(get_db)):
    """Append a new reading entry to the specified asset."""
    a = repo.get(db, asset_id)
    if not a: raise HTTPException(404, "Asset not found")
    readings = list(a.readings or [])
    readings.append({"id": uuid.uuid4().hex[:8], "reading_type": body.reading_type, "value": body.value, "unit": body.unit, "date": body.date, "recorded_at": datetime.utcnow().isoformat()})
    a.readings = readings
    db.commit(); db.refresh(a)
    return a
