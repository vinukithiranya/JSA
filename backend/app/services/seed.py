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


# ─── Full-Feature Test Template ───────────────────────────────────────────────

FULL_FEATURE_TEMPLATE = {
    "sections": [
        # ── 1. Title Page ──────────────────────────────────────────────────────
        {
            "id": "ft-s1",
            "title": "Title Page",
            "is_title_page": True,
            "collapsed": False,
            "questions": [
                {"id": "ft-s1-q1", "text": "Site", "type": "site", "required": True},
                {"id": "ft-s1-q2", "text": "Conducted by", "type": "person", "required": True},
                {"id": "ft-s1-q3", "text": "Inspection date & time", "type": "inspection_date", "required": True, "include_date": True, "include_time": True},
                {"id": "ft-s1-q4", "text": "Inspection location", "type": "inspection_location", "required": False},
                {"id": "ft-s1-q5", "text": "Document number", "type": "document_number", "required": True, "doc_number_format": "RIG-[number]"},
                {"id": "ft-s1-q6", "text": "Asset / Equipment ID", "type": "asset", "required": False},
                {"id": "ft-s1-q7", "text": "Company", "type": "company", "required": False},
            ],
        },

        # ── 2. Instructions & Text Responses ───────────────────────────────────
        {
            "id": "ft-s2",
            "title": "Instructions & Text Responses",
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s2-q1",
                    "text": "Before proceeding, ensure all personnel have been briefed on the scope of work, emergency procedures, and site-specific hazards. This section tests Instruction and Text response types.",
                    "type": "instruction",
                    "required": False,
                },
                {
                    "id": "ft-s2-q2",
                    "text": "Short text — Inspector's name",
                    "type": "text",
                    "text_format": "short",
                    "required": True,
                },
                {
                    "id": "ft-s2-q3",
                    "text": "Long text — Describe the scope of work and any pre-existing site conditions",
                    "type": "text",
                    "text_format": "long",
                    "required": False,
                },
            ],
        },

        # ── 3. Multiple Choice — all preset variants ────────────────────────────
        {
            "id": "ft-s3",
            "title": "Multiple Choice — All Presets",
            "collapsed": False,
            "score_enabled": True,
            "questions": [
                {
                    "id": "ft-s3-q1",
                    "text": "Overall site condition (Good / Fair / Poor / N/A)",
                    "type": "multiple_choice",
                    "required": True,
                    "option_meta": [
                        {"id": "ft-m1-a", "label": "Good",  "color": "green",  "is_flagged": False, "score": 3},
                        {"id": "ft-m1-b", "label": "Fair",  "color": "yellow", "is_flagged": False, "score": 2},
                        {"id": "ft-m1-c", "label": "Poor",  "color": "red",    "is_flagged": True,  "score": 0},
                        {"id": "ft-m1-d", "label": "N/A",   "color": "gray",   "is_flagged": False, "score": None},
                    ],
                    "options": ["Good", "Fair", "Poor", "N/A"],
                    "flagged_responses": ["Poor"],
                    "score_map": {"Good": 3, "Fair": 2, "Poor": 0, "N/A": None},
                    "logic_rules": [
                        {
                            "id": "ft-lr1",
                            "op": "is",
                            "value": "Poor",
                            "trigger": "require_action",
                        },
                        {
                            "id": "ft-lr2",
                            "op": "is",
                            "value": "Poor",
                            "trigger": "require_evidence",
                            "evidence_notes": True,
                            "evidence_media": True,
                        },
                    ],
                },
                {
                    "id": "ft-s3-q2",
                    "text": "Is the area safe to proceed? (Yes / No / N/A)",
                    "type": "multiple_choice",
                    "required": True,
                    "option_meta": [
                        {"id": "ft-m2-a", "label": "Yes", "color": "green", "is_flagged": False, "score": 2},
                        {"id": "ft-m2-b", "label": "No",  "color": "red",   "is_flagged": True,  "score": 0},
                        {"id": "ft-m2-c", "label": "N/A", "color": "gray",  "is_flagged": False, "score": None},
                    ],
                    "options": ["Yes", "No", "N/A"],
                    "flagged_responses": ["No"],
                    "score_map": {"Yes": 2, "No": 0, "N/A": None},
                    "logic_rules": [
                        {
                            "id": "ft-lr3",
                            "op": "is",
                            "value": "No",
                            "trigger": "ask_questions",
                        },
                    ],
                    "nested_questions": [
                        {
                            "id": "ft-s3-q2-nq1",
                            "text": "Describe the unsafe condition",
                            "type": "text",
                            "text_format": "long",
                            "required": True,
                        },
                        {
                            "id": "ft-s3-q2-nq2",
                            "text": "Has the area been barricaded?",
                            "type": "multiple_choice",
                            "required": True,
                            "option_meta": [
                                {"id": "ft-nq2-a", "label": "Yes", "color": "green", "is_flagged": False, "score": None},
                                {"id": "ft-nq2-b", "label": "No",  "color": "red",   "is_flagged": True,  "score": None},
                            ],
                            "options": ["Yes", "No"],
                            "flagged_responses": ["No"],
                            "score_map": {},
                        },
                    ],
                },
                {
                    "id": "ft-s3-q3",
                    "text": "Inspection result (Pass / Fail / N/A)",
                    "type": "multiple_choice",
                    "required": True,
                    "option_meta": [
                        {"id": "ft-m3-a", "label": "Pass", "color": "green", "is_flagged": False, "score": 1},
                        {"id": "ft-m3-b", "label": "Fail", "color": "red",   "is_flagged": True,  "score": 0},
                        {"id": "ft-m3-c", "label": "N/A",  "color": "gray",  "is_flagged": False, "score": None},
                    ],
                    "options": ["Pass", "Fail", "N/A"],
                    "flagged_responses": ["Fail"],
                    "score_map": {"Pass": 1, "Fail": 0, "N/A": None},
                },
                {
                    "id": "ft-s3-q4",
                    "text": "Risk level (Safe / At Risk / N/A) — multiple selection allowed",
                    "type": "multiple_choice",
                    "multiple_selection": True,
                    "required": False,
                    "option_meta": [
                        {"id": "ft-m4-a", "label": "Safe",    "color": "green",  "is_flagged": False, "score": None},
                        {"id": "ft-m4-b", "label": "At Risk",  "color": "orange", "is_flagged": True,  "score": None},
                        {"id": "ft-m4-c", "label": "N/A",      "color": "gray",   "is_flagged": False, "score": None},
                    ],
                    "options": ["Safe", "At Risk", "N/A"],
                    "flagged_responses": ["At Risk"],
                    "score_map": {},
                },
                {
                    "id": "ft-s3-q5",
                    "text": "Compliance status (Compliant / Non-Compliant / N/A)",
                    "type": "multiple_choice",
                    "required": True,
                    "option_meta": [
                        {"id": "ft-m5-a", "label": "Compliant",     "color": "green", "is_flagged": False, "score": 3},
                        {"id": "ft-m5-b", "label": "Non-Compliant", "color": "red",   "is_flagged": True,  "score": 0},
                        {"id": "ft-m5-c", "label": "N/A",           "color": "gray",  "is_flagged": False, "score": None},
                    ],
                    "options": ["Compliant", "Non-Compliant", "N/A"],
                    "flagged_responses": ["Non-Compliant"],
                    "score_map": {"Compliant": 3, "Non-Compliant": 0, "N/A": None},
                    "logic_rules": [
                        {
                            "id": "ft-lr4",
                            "op": "is",
                            "value": "Non-Compliant",
                            "trigger": "notify",
                            "notify_msg": "Non-compliance detected — supervisor review required.",
                            "notify_timing": "immediately",
                        },
                    ],
                },
                {
                    "id": "ft-s3-q6",
                    "text": "Equipment status (Sound – No Issues / Issues Found / N/A)",
                    "type": "multiple_choice",
                    "required": True,
                    "option_meta": [
                        {"id": "ft-m6-a", "label": "Sound – No Issues", "color": "green",  "is_flagged": False, "score": 2},
                        {"id": "ft-m6-b", "label": "Issues Found",      "color": "orange", "is_flagged": True,  "score": 0},
                        {"id": "ft-m6-c", "label": "N/A",               "color": "gray",   "is_flagged": False, "score": None},
                    ],
                    "options": ["Sound – No Issues", "Issues Found", "N/A"],
                    "flagged_responses": ["Issues Found"],
                    "score_map": {"Sound – No Issues": 2, "Issues Found": 0, "N/A": None},
                },
                {
                    "id": "ft-s3-q7",
                    "text": "Work quality (Satisfactory / Unsatisfactory / N/A)",
                    "type": "multiple_choice",
                    "required": False,
                    "option_meta": [
                        {"id": "ft-m7-a", "label": "Satisfactory",   "color": "green", "is_flagged": False, "score": 1},
                        {"id": "ft-m7-b", "label": "Unsatisfactory", "color": "red",   "is_flagged": True,  "score": 0},
                        {"id": "ft-m7-c", "label": "N/A",            "color": "gray",  "is_flagged": False, "score": None},
                    ],
                    "options": ["Satisfactory", "Unsatisfactory", "N/A"],
                    "flagged_responses": ["Unsatisfactory"],
                    "score_map": {"Satisfactory": 1, "Unsatisfactory": 0, "N/A": None},
                },
                {
                    "id": "ft-s3-q8",
                    "text": "Outcome (Positive / Negative / N/A)",
                    "type": "multiple_choice",
                    "required": False,
                    "option_meta": [
                        {"id": "ft-m8-a", "label": "Positive", "color": "green", "is_flagged": False, "score": 1},
                        {"id": "ft-m8-b", "label": "Negative", "color": "red",   "is_flagged": True,  "score": 0},
                        {"id": "ft-m8-c", "label": "N/A",      "color": "gray",  "is_flagged": False, "score": None},
                    ],
                    "options": ["Positive", "Negative", "N/A"],
                    "flagged_responses": ["Negative"],
                    "score_map": {"Positive": 1, "Negative": 0, "N/A": None},
                },
            ],
        },

        # ── 4. Number & Slider ─────────────────────────────────────────────────
        {
            "id": "ft-s4",
            "title": "Number & Slider",
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s4-q1",
                    "text": "Number — Load weight (plain number)",
                    "type": "number",
                    "number_format": "number",
                    "number_unit": "kg",
                    "required": True,
                },
                {
                    "id": "ft-s4-q2",
                    "text": "Number — Task completion (%)",
                    "type": "number",
                    "number_format": "percentage",
                    "required": False,
                },
                {
                    "id": "ft-s4-q3",
                    "text": "Number — Repair cost estimate",
                    "type": "number",
                    "number_format": "cost",
                    "required": False,
                },
                {
                    "id": "ft-s4-q4",
                    "text": "Slider — Overall safety rating (0 = critical, 10 = perfect)",
                    "type": "slider",
                    "min": 0,
                    "max": 10,
                    "step": 1,
                    "required": True,
                    "logic_rules": [
                        {
                            "id": "ft-lr5",
                            "op": "lte",
                            "value": "3",
                            "trigger": "require_action",
                        },
                    ],
                },
                {
                    "id": "ft-s4-q5",
                    "text": "Slider — Wind speed (Beaufort scale 0–12)",
                    "type": "slider",
                    "min": 0,
                    "max": 12,
                    "step": 1,
                    "required": False,
                },
            ],
        },

        # ── 5. Date, Time & Checkbox ───────────────────────────────────────────
        {
            "id": "ft-s5",
            "title": "Date, Time & Checkbox",
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s5-q1",
                    "text": "Date & Time — Last maintenance performed",
                    "type": "datetime",
                    "include_date": True,
                    "include_time": True,
                    "required": False,
                },
                {
                    "id": "ft-s5-q2",
                    "text": "Date only — Next scheduled inspection",
                    "type": "datetime",
                    "include_date": True,
                    "include_time": False,
                    "required": False,
                },
                {
                    "id": "ft-s5-q3",
                    "text": "Time only — Work start time",
                    "type": "datetime",
                    "include_date": False,
                    "include_time": True,
                    "required": False,
                },
                {
                    "id": "ft-s5-q4",
                    "text": "Checkbox — All PPE items inspected and serviceable",
                    "type": "checkbox",
                    "required": True,
                },
                {
                    "id": "ft-s5-q5",
                    "text": "Checkbox — I confirm the information above is accurate",
                    "type": "checkbox",
                    "required": True,
                },
            ],
        },

        # ── 6. Media, Annotation & Location ───────────────────────────────────
        {
            "id": "ft-s6",
            "title": "Media, Annotation & Location",
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s6-q1",
                    "text": "Media — Photograph the work area (before)",
                    "type": "media",
                    "required": True,
                },
                {
                    "id": "ft-s6-q2",
                    "text": "Media — Photograph any hazards or non-conformances found",
                    "type": "media",
                    "required": False,
                },
                {
                    "id": "ft-s6-q3",
                    "text": "Annotation — Mark areas of concern on the diagram",
                    "type": "annotation",
                    "required": False,
                },
                {
                    "id": "ft-s6-q4",
                    "text": "Location — Pin the GPS location of the work site",
                    "type": "location",
                    "required": False,
                },
            ],
        },

        # ── 7. Table ───────────────────────────────────────────────────────────
        {
            "id": "ft-s7",
            "title": "Table — Equipment Checklist",
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s7-q1",
                    "text": "Complete the equipment checklist table below",
                    "type": "table",
                    "required": False,
                    "table_columns": [
                        {"id": "ft-tc1", "label": "Item / Equipment",    "type": "text"},
                        {"id": "ft-tc2", "label": "Condition",           "type": "multiple_choice", "options": ["Good", "Fair", "Poor", "N/A"]},
                        {"id": "ft-tc3", "label": "Serviceable",         "type": "checkbox"},
                        {"id": "ft-tc4", "label": "Quantity",            "type": "number"},
                        {"id": "ft-tc5", "label": "Inspector notes",     "type": "text"},
                    ],
                },
                {
                    "id": "ft-s7-q2",
                    "text": "Table — Hazard register",
                    "type": "table",
                    "required": False,
                    "table_columns": [
                        {"id": "ft-tc6", "label": "Hazard description",  "type": "text"},
                        {"id": "ft-tc7", "label": "Risk rating",         "type": "multiple_choice", "options": ["High", "Medium", "Low"]},
                        {"id": "ft-tc8", "label": "Control measure",     "type": "text"},
                        {"id": "ft-tc9", "label": "Residual risk score", "type": "number"},
                        {"id": "ft-tc10","label": "Closed out",          "type": "checkbox"},
                    ],
                },
            ],
        },

        # ── 8. Completion ──────────────────────────────────────────────────────
        {
            "id": "ft-s8",
            "title": "Completion",
            "is_completion": True,
            "collapsed": False,
            "questions": [
                {
                    "id": "ft-s8-q1",
                    "text": "By signing below I confirm all information in this inspection is true and accurate.",
                    "type": "instruction",
                    "required": False,
                },
                {
                    "id": "ft-s8-q2",
                    "text": "Inspector signature",
                    "type": "signature",
                    "required": True,
                },
                {
                    "id": "ft-s8-q3",
                    "text": "Supervisor / Witness signature",
                    "type": "signature",
                    "required": False,
                },
            ],
        },
    ]
}


_RICH_TEMPLATES = [
    {
        "id": "tpl-0",
        "name": "Full Feature Test Template",
        "category": "Safety",
        "description": "Covers every response type and feature: all title-page fields, short/long text, every MC preset with scoring & logic rules, nested questions, number formats, sliders, date/time variants, checkbox, media, annotation, location, two table layouts, and signature sign-off.",
        "form_schema": FULL_FEATURE_TEMPLATE,
    },
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
    """Insert or update seed templates in the database if they are missing or empty."""
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
    """Seed the database with default admin users and inspection templates if none exist."""
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
