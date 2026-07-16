from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import teams_repository, users_repository


def check_permission(user_id: str, required_role: str, db: Session):
    """Raises HTTP 403 if the user does not have the required role."""
    user = users_repository.get_by_id(db, user_id)
    if not user or user.role != required_role:
        raise HTTPException(status_code=403, detail="Permission denied")


def team_based_visibility(user_id: str, db: Session):
    """Returns the team ID for the user, raising HTTP 403 if not assigned to any team."""
    team_member = teams_repository.get_member_by_user(db, user_id)
    if not team_member:
        raise HTTPException(status_code=403, detail="User not assigned to any team")
    return team_member.team_id
