from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.db_models import UserDB, TeamMemberDB

def check_permission(user_id: str, required_role: str, db: Session):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user or user.role != required_role:
        raise HTTPException(status_code=403, detail="Permission denied")

def team_based_visibility(user_id: str, db: Session):
    team_member = db.query(TeamMemberDB).filter(TeamMemberDB.user_id == user_id).first()
    if not team_member:
        raise HTTPException(status_code=403, detail="User not assigned to any team")
    return team_member.team_id