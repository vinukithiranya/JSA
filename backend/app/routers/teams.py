from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import teams_repository as repo
from app.schemas.models import TeamCreate, TeamOut, TeamMemberCreate, TeamMemberOut
from app.services.rbac import team_based_visibility
from app.services.store import new_id

router = APIRouter()


@router.post("/teams", response_model=TeamOut)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    """Create a new team and persist it to the database."""
    return repo.create_team(db, id=new_id("team"), **team.model_dump())


@router.get("/teams", response_model=list[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    """Return all teams from the database."""
    return repo.list_teams(db)


@router.post("/team-members", response_model=TeamMemberOut)
def add_team_member(member: TeamMemberCreate, db: Session = Depends(get_db)):
    """Add a new member to a team and persist the record."""
    return repo.add_member(db, id=new_id("member"), **member.model_dump())


@router.get("/team-members/{team_id}", response_model=list[TeamMemberOut])
def list_team_members(team_id: str, db: Session = Depends(get_db)):
    """Return all members belonging to the specified team."""
    return repo.list_members(db, team_id)


@router.get("/teams/{team_id}", response_model=TeamOut)
def get_team(team_id: str, user_id: str, db: Session = Depends(get_db)):
    """Retrieve a team by ID, enforcing team-based visibility for the requesting user."""
    team_id_from_user = team_based_visibility(user_id, db)
    if team_id_from_user != team_id:
        raise HTTPException(status_code=403, detail="Access denied to this team")
    return repo.get_team(db, team_id)
