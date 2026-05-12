from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import ActionDB
from app.schemas.models import ActionCreate, ActionOut

router = APIRouter()


@router.post("/actions", response_model=ActionOut)
def create_action(action: ActionCreate, db: Session = Depends(get_db)):
    new_action = ActionDB(**action.dict())
    db.add(new_action)
    db.commit()
    db.refresh(new_action)
    return new_action


@router.get("/actions", response_model=list[ActionOut])
def list_actions(db: Session = Depends(get_db)):
    return db.query(ActionDB).all()


@router.patch("/actions/{action_id}", response_model=ActionOut)
def update_action_status(action_id: str, status: str, db: Session = Depends(get_db)):
    action = db.query(ActionDB).filter(ActionDB.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = status
    db.commit()
    db.refresh(action)
    return action