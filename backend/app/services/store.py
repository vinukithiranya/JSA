from datetime import datetime
from uuid import uuid4

from app.schemas.models import JsaRecord, TemplateOut

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

TEMPLATES: list[TemplateOut] = [
    TemplateOut(id="tpl-1", name="Marine Lifting JSA", category="JSA", description="Default lifting job JSA"),
    TemplateOut(id="tpl-2", name="Hot Work Permit", category="Inspection", description="Hot work inspection form"),
]

JSA_STORE: dict[str, JsaRecord] = {}


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


def now() -> datetime:
    return datetime.utcnow()
