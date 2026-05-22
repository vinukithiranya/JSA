import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.db_models import AssetDB

router = APIRouter()

class AssetIn(BaseModel):
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
    reading_type: str
    value: float
    unit: str
    date: str

@router.get("")
def list_assets(db: Session = Depends(get_db)):
    return db.query(AssetDB).order_by(AssetDB.created_at.desc()).all()

@router.post("")
def create_asset(body: AssetIn, db: Session = Depends(get_db)):
    asset = AssetDB(id=f"ast-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(asset); db.commit(); db.refresh(asset)
    return asset

@router.get("/{asset_id}")
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    a = db.query(AssetDB).filter(AssetDB.id == asset_id).first()
    if not a: raise HTTPException(404, "Asset not found")
    return a

@router.put("/{asset_id}")
def update_asset(asset_id: str, body: AssetIn, db: Session = Depends(get_db)):
    a = db.query(AssetDB).filter(AssetDB.id == asset_id).first()
    if not a: raise HTTPException(404, "Asset not found")
    for k, v in body.model_dump().items(): setattr(a, k, v)
    db.commit(); db.refresh(a)
    return a

@router.delete("/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    a = db.query(AssetDB).filter(AssetDB.id == asset_id).first()
    if not a: raise HTTPException(404, "Asset not found")
    db.delete(a); db.commit()
    return {"ok": True}

@router.post("/{asset_id}/readings")
def add_reading(asset_id: str, body: ReadingIn, db: Session = Depends(get_db)):
    a = db.query(AssetDB).filter(AssetDB.id == asset_id).first()
    if not a: raise HTTPException(404, "Asset not found")
    readings = list(a.readings or [])
    readings.append({"id": uuid.uuid4().hex[:8], "reading_type": body.reading_type, "value": body.value, "unit": body.unit, "date": body.date, "recorded_at": datetime.utcnow().isoformat()})
    a.readings = readings
    db.commit(); db.refresh(a)
    return a
