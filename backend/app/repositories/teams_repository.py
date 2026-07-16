from sqlalchemy.orm import Session

from app.models.db_models import TeamDB, TeamMemberDB


def create_team(db: Session, **fields) -> TeamDB:
    """Create and persist a new team."""
    row = TeamDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_teams(db: Session) -> list[TeamDB]:
    """Return all teams."""
    return db.query(TeamDB).all()


def get_team(db: Session, team_id: str) -> TeamDB | None:
    """Return a team by ID, or None if not found."""
    return db.query(TeamDB).filter(TeamDB.id == team_id).first()


def add_member(db: Session, **fields) -> TeamMemberDB:
    """Add and persist a new team member."""
    row = TeamMemberDB(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_members(db: Session, team_id: str) -> list[TeamMemberDB]:
    """Return all members belonging to the given team."""
    return db.query(TeamMemberDB).filter(TeamMemberDB.team_id == team_id).all()


def get_member_by_user(db: Session, user_id: str) -> TeamMemberDB | None:
    """Return the team membership row for a given user, or None."""
    return db.query(TeamMemberDB).filter(TeamMemberDB.user_id == user_id).first()
