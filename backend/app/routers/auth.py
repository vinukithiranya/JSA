from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import UserDB
from app.schemas.models import LoginRequest, LoginResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    match = db.query(UserDB).filter(UserDB.email == payload.email, UserDB.password_hash == payload.password).first()
    if not match or not match.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return LoginResponse(
        token=f"demo-token-{match.id}",
        user=UserOut(id=match.id, email=match.email, full_name=match.full_name, role=match.role),
    )
