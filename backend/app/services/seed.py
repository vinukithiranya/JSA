from sqlalchemy.orm import Session

from app.models.db_models import TemplateDB, UserDB


def seed_defaults(db: Session) -> None:
    try:
        users_count = db.query(UserDB).count()
    except Exception:
        return
    
    if users_count == 0:
        db.add_all(
            [
                UserDB(id="u-admin", email="admin@rigpro.com", password_hash="admin123", full_name="RigPro Admin", role="admin"),
                UserDB(id="u-tech", email="tech@rigpro.com", password_hash="tech123", full_name="Field Technician", role="technician"),
                UserDB(
                    id="u-sup",
                    email="supervisor@rigpro.com",
                    password_hash="super123",
                    full_name="Safety Supervisor",
                    role="supervisor",
                ),
            ]
        )
        db.commit()

    template_count = db.query(TemplateDB).count()
    if template_count == 0:
        db.add_all(
            [
                TemplateDB(
                    id="tpl-1",
                    name="Marine Lifting JSA",
                    category="JSA",
                    description="Default lifting job JSA",
                    form_schema={"sections": []},
                    created_by="u-admin",
                ),
                TemplateDB(
                    id="tpl-2",
                    name="Hot Work Permit",
                    category="Inspection",
                    description="Hot work inspection form",
                    form_schema={"sections": []},
                    created_by="u-admin",
                ),
            ]
        )
        db.commit()
