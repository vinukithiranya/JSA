from sqlalchemy.orm import Session

from app.models.db_models import TemplateDB, UserDB


# ─── Rich template schemas ────────────────────────────────────────────────────

MARINE_VESSEL_TEMPLATE = {
    "sections": [
        {
            "id": "s1",
            "title": "General Safety",
            "questions": [
                {
                    "id": "s1q1",
                    "text": "Is the work area free from tripping hazards?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "N/A": None},
                },
                {
                    "id": "s1q2",
                    "text": "Is appropriate PPE available and worn?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "N/A": None},
                },
                {
                    "id": "s1q3",
                    "text": "Describe any hazards observed in the work area",
                    "type": "text",
                    "required": False,
                },
                {
                    "id": "s1q4",
                    "text": "Are all personnel briefed on the task?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s1q5",
                    "text": "Attach photo of work area",
                    "type": "media",
                    "required": False,
                },
            ],
        },
        {
            "id": "s2",
            "title": "Equipment Check",
            "questions": [
                {
                    "id": "s2q1",
                    "text": "Is all equipment in good working condition?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "N/A": None},
                },
                {
                    "id": "s2q2",
                    "text": "Equipment condition rating (1 = poor, 10 = excellent)",
                    "type": "slider",
                    "required": False,
                    "min": 1,
                    "max": 10,
                    "step": 1,
                },
                {
                    "id": "s2q3",
                    "text": "Date of last equipment service",
                    "type": "date_time",
                    "required": False,
                },
                {
                    "id": "s2q4",
                    "text": "Select applicable checks completed",
                    "type": "checkbox",
                    "required": False,
                    "options": [
                        "Visual inspection done",
                        "Safety guards in place",
                        "Controls tested",
                        "Emergency stop verified",
                    ],
                },
                {
                    "id": "s2q5",
                    "text": "Equipment temperature (°C)",
                    "type": "temperature",
                    "required": False,
                    "min": -10,
                    "max": 120,
                },
            ],
        },
        {
            "id": "s3",
            "title": "Lifting Operations",
            "questions": [
                {
                    "id": "s3q1",
                    "text": "Has a lift plan been completed?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "N/A": None},
                },
                {
                    "id": "s3q2",
                    "text": "Is the lifting equipment rated for the load?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "N/A": None},
                },
                {
                    "id": "s3q3",
                    "text": "Is the exclusion zone established and clear?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s3q4",
                    "text": "Load weight (kg)",
                    "type": "number",
                    "required": False,
                },
                {
                    "id": "s3q5",
                    "text": "Rigger/Dogman certification number",
                    "type": "text",
                    "required": False,
                },
                {
                    "id": "s3q6",
                    "text": "Pin GPS location of lift",
                    "type": "location",
                    "required": False,
                },
            ],
        },
        {
            "id": "s4",
            "title": "Environmental Conditions",
            "questions": [
                {
                    "id": "s4q1",
                    "text": "Are weather conditions suitable for work?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s4q2",
                    "text": "Current ambient temperature (°C)",
                    "type": "temperature",
                    "required": False,
                    "min": -10,
                    "max": 55,
                },
                {
                    "id": "s4q3",
                    "text": "Wind speed rating",
                    "type": "slider",
                    "required": False,
                    "min": 0,
                    "max": 10,
                    "step": 1,
                },
                {
                    "id": "s4q4",
                    "text": "Environmental observations",
                    "type": "text",
                    "required": False,
                },
            ],
        },
    ]
}

HOT_WORK_TEMPLATE = {
    "sections": [
        {
            "id": "s1",
            "title": "Pre-Work Checks",
            "questions": [
                {
                    "id": "s1q1",
                    "text": "Has the hot work area been cleared of flammables within 10m?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s1q2",
                    "text": "Is a fire extinguisher positioned at the work site?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s1q3",
                    "text": "Is a fire watch person assigned?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s1q4",
                    "text": "Gas test reading (LEL %)",
                    "type": "number",
                    "required": True,
                },
                {
                    "id": "s1q5",
                    "text": "Attach photo of cleared hot work zone",
                    "type": "media",
                    "required": False,
                },
            ],
        },
        {
            "id": "s2",
            "title": "PPE & Equipment",
            "questions": [
                {
                    "id": "s2q1",
                    "text": "Select PPE worn",
                    "type": "checkbox",
                    "required": True,
                    "options": [
                        "Welding helmet/face shield",
                        "Leather gloves",
                        "Fire-retardant clothing",
                        "Safety boots",
                        "Hearing protection",
                    ],
                },
                {
                    "id": "s2q2",
                    "text": "Equipment surface temperature before work (°C)",
                    "type": "temperature",
                    "required": False,
                    "min": 0,
                    "max": 200,
                },
                {
                    "id": "s2q3",
                    "text": "Welding machine condition",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Good", "Acceptable", "Poor"],
                    "flagged_responses": ["Poor"],
                    "score_map": {"Good": 1, "Acceptable": 0.5, "Poor": 0},
                },
            ],
        },
        {
            "id": "s3",
            "title": "Post-Work Inspection",
            "questions": [
                {
                    "id": "s3q1",
                    "text": "Has the work area been inspected for smouldering?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s3q2",
                    "text": "Post-work surface temperature (°C)",
                    "type": "temperature",
                    "required": True,
                    "min": 0,
                    "max": 300,
                },
                {
                    "id": "s3q3",
                    "text": "30-minute fire watch completed?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0},
                },
                {
                    "id": "s3q4",
                    "text": "Post-work observations",
                    "type": "text",
                    "required": False,
                },
            ],
        },
    ]
}

EQUIPMENT_INSPECTION_TEMPLATE = {
    "sections": [
        {
            "id": "s1",
            "title": "Visual Inspection",
            "questions": [
                {
                    "id": "s1q1",
                    "text": "Is the equipment free from visible damage?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "Minor damage"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "Minor damage": 0.5, "No": 0},
                },
                {
                    "id": "s1q2",
                    "text": "Are all labels and safety markings legible?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "Partially"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "Partially": 0.5, "No": 0},
                },
                {
                    "id": "s1q3",
                    "text": "Overall equipment rating (1 = poor, 10 = excellent)",
                    "type": "slider",
                    "required": True,
                    "min": 1,
                    "max": 10,
                    "step": 1,
                },
                {
                    "id": "s1q4",
                    "text": "Photo of equipment (front)",
                    "type": "media",
                    "required": True,
                },
                {
                    "id": "s1q5",
                    "text": "Photo of equipment (serial number plate)",
                    "type": "media",
                    "required": False,
                },
            ],
        },
        {
            "id": "s2",
            "title": "Operational Check",
            "questions": [
                {
                    "id": "s2q1",
                    "text": "Does the equipment start and run correctly?",
                    "type": "multiple_choice",
                    "required": True,
                    "options": ["Yes", "No", "Not tested"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 1, "No": 0, "Not tested": None},
                },
                {
                    "id": "s2q2",
                    "text": "Operating temperature during test (°C)",
                    "type": "temperature",
                    "required": False,
                    "min": 0,
                    "max": 150,
                },
                {
                    "id": "s2q3",
                    "text": "Select functions tested",
                    "type": "checkbox",
                    "required": False,
                    "options": [
                        "Start / Stop",
                        "Emergency stop",
                        "Speed controls",
                        "Load test",
                        "Alarms / indicators",
                    ],
                },
                {
                    "id": "s2q4",
                    "text": "Next service due date",
                    "type": "date_time",
                    "required": False,
                },
                {
                    "id": "s2q5",
                    "text": "Inspector notes",
                    "type": "text",
                    "required": False,
                },
                {
                    "id": "s2q6",
                    "text": "GPS location of equipment",
                    "type": "location",
                    "required": False,
                },
            ],
        },
    ]
}


_RICH_TEMPLATES = [
    {
        "id": "tpl-1",
        "name": "Marine Vessel Safety Inspection",
        "category": "Inspection",
        "description": "Comprehensive pre-work safety inspection for marine vessel operations including equipment, lifting, and environmental checks.",
        "form_schema": MARINE_VESSEL_TEMPLATE,
    },
    {
        "id": "tpl-2",
        "name": "Hot Work Permit",
        "category": "Inspection",
        "description": "Hot work permit checklist for welding, cutting, grinding, and other ignition-source activities.",
        "form_schema": HOT_WORK_TEMPLATE,
    },
    {
        "id": "tpl-3",
        "name": "Equipment Pre-Use Inspection",
        "category": "Inspection",
        "description": "General equipment inspection checklist for pre-use condition assessment and operational verification.",
        "form_schema": EQUIPMENT_INSPECTION_TEMPLATE,
    },
]


def _has_questions(form_schema: dict) -> bool:
    """Return True if at least one section has at least one question."""
    for section in form_schema.get("sections", []):
        if section.get("questions"):
            return True
    return False


def _ensure_templates(db: Session) -> None:
    for tdata in _RICH_TEMPLATES:
        existing = db.query(TemplateDB).filter(TemplateDB.id == tdata["id"]).first()
        if existing is None:
            db.add(TemplateDB(
                id=tdata["id"],
                name=tdata["name"],
                category=tdata["category"],
                description=tdata["description"],
                form_schema=tdata["form_schema"],
                created_by="u-admin",
            ))
        elif not _has_questions(existing.form_schema or {}):
            existing.name = tdata["name"]
            existing.category = tdata["category"]
            existing.description = tdata["description"]
            existing.form_schema = tdata["form_schema"]
    db.commit()


def seed_defaults(db: Session) -> None:
    try:
        users_count = db.query(UserDB).count()
    except Exception:
        return

    if users_count == 0:
        db.add_all([
            UserDB(id="u-admin", email="admin@rigpro.com", password_hash="admin123", full_name="RigPro Admin", role="admin"),
            UserDB(id="u-tech", email="tech@rigpro.com", password_hash="tech123", full_name="Field Technician", role="technician"),
            UserDB(id="u-sup", email="supervisor@rigpro.com", password_hash="super123", full_name="Safety Supervisor", role="supervisor"),
        ])
        db.commit()

    _ensure_templates(db)
