from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db_models import TeamDB, TeamMemberDB
from app.schemas.models import TeamCreate, TeamOut, TeamMemberCreate, TeamMemberOut
from app.services.rbac import check_permission, team_based_visibility
from app.services.store import new_id

router = APIRouter()


@router.post("/teams", response_model=TeamOut)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    new_team = TeamDB(id=new_id("team"), **team.model_dump())
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    return db.query(TeamDB).all()


@router.post("/team-members", response_model=TeamMemberOut)
def add_team_member(member: TeamMemberCreate, db: Session = Depends(get_db)):
    new_member = TeamMemberDB(id=new_id("member"), **member.model_dump())
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@router.get("/team-members/{team_id}", response_model=list[TeamMemberOut])
def list_team_members(team_id: str, db: Session = Depends(get_db)):
    return db.query(TeamMemberDB).filter(TeamMemberDB.team_id == team_id).all()


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team(team_id: str, user_id: str, db: Session = Depends(get_db)):
    team_id_from_user = team_based_visibility(user_id, db)
    if team_id_from_user != team_id:
        raise HTTPException(status_code=403, detail="Access denied to this team")
    return db.query(TeamDB).filter(TeamDB.id == team_id).first()