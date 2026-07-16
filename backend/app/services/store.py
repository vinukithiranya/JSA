from datetime import datetime
from uuid import uuid4

USERS = [
    {
        "id": "u-admin",
        "email": "admin@rigpro.local",
        "password": "admin123",
        "full_name": "RigPro Admin",
        "role": "admin",
    },
    {
        "id": "u-tech",
        "email": "tech@rigpro.local",
        "password": "tech123",
        "full_name": "Field Technician",
        "role": "technician",
    },
    {
        "id": "u-sup",
        "email": "supervisor@rigpro.local",
        "password": "super123",
        "full_name": "Safety Supervisor",
        "role": "supervisor",
    },
]


def new_id(prefix: str) -> str:
    """Generate a unique ID string with the given prefix."""
    return f"{prefix}-{uuid4().hex[:8]}"


def now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.utcnow()
