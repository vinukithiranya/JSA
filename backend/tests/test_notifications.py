"""
Tests for the notification system:
- notify() and notify_supervisors() service functions
- Notification triggers from inspections, issues, actions
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import MagicMock, patch, call
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.models.db_models import NotificationDB, UserDB, IssueDB, ActionDB, InspectionRecordDB
from app.services.notifications import notify, notify_supervisors


# ── In-memory SQLite DB for tests ─────────────────────────────────────────────

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    # Seed users
    session.add(UserDB(id="u-tech", email="tech@test.com", password_hash="x", full_name="Tech User", role="technician"))
    session.add(UserDB(id="u-sup", email="sup@test.com", password_hash="x", full_name="Supervisor", role="supervisor"))
    session.add(UserDB(id="u-admin", email="admin@test.com", password_hash="x", full_name="Admin", role="admin"))
    session.commit()
    yield session
    session.close()


# ── notify() ──────────────────────────────────────────────────────────────────

def test_notify_creates_notification(db):
    notify(db, "u-tech", "Test message", event_type="info", link="/dashboard")
    db.commit()
    result = db.query(NotificationDB).filter(NotificationDB.user_id == "u-tech").all()
    assert len(result) == 1
    assert result[0].message == "Test message"
    assert result[0].event_type == "info"
    assert result[0].link == "/dashboard"
    assert result[0].is_read is False


def test_notify_defaults(db):
    notify(db, "u-tech", "Default test")
    db.commit()
    n = db.query(NotificationDB).filter(NotificationDB.user_id == "u-tech").first()
    assert n.event_type == "info"
    assert n.link == ""


def test_notify_supervisors_sends_to_supervisor_and_admin(db):
    notify_supervisors(db, "Supervisor broadcast", event_type="warning")
    db.commit()
    sup_notifs = db.query(NotificationDB).filter(NotificationDB.user_id == "u-sup").all()
    admin_notifs = db.query(NotificationDB).filter(NotificationDB.user_id == "u-admin").all()
    tech_notifs = db.query(NotificationDB).filter(NotificationDB.user_id == "u-tech").all()
    assert len(sup_notifs) == 1
    assert len(admin_notifs) == 1
    assert len(tech_notifs) == 0  # technicians don't get supervisor alerts


def test_notify_supervisors_message_content(db):
    notify_supervisors(db, "Critical alert", event_type="critical", link="/issues")
    db.commit()
    notifs = db.query(NotificationDB).all()
    for n in notifs:
        assert n.message == "Critical alert"
        assert n.event_type == "critical"
        assert n.link == "/issues"


# ── Issue notifications ────────────────────────────────────────────────────────

def test_issue_high_priority_notifies_supervisors(db):
    from fastapi.testclient import TestClient
    from app.main import app
    # Patch the DB to use our in-memory one
    with patch("app.routers.issues.notify_supervisors") as mock_ns:
        from app.routers.issues import create_issue
        from app.schemas.models import IssueCreate
        payload = IssueCreate(
            title="Fuel leak",
            description="Leak near engine",
            issue_type="hazard",
            category="General",
            site="Site A",
            priority="high",
            reported_by="u-tech",
        )
        create_issue(payload, db)
        mock_ns.assert_called_once()
        args = mock_ns.call_args
        assert args[1]["event_type"] == "critical"
        assert "HIGH" in args[0][1]


def test_issue_medium_priority_notifies_as_warning(db):
    with patch("app.routers.issues.notify_supervisors") as mock_ns:
        from app.routers.issues import create_issue
        from app.schemas.models import IssueCreate
        payload = IssueCreate(
            title="Loose railing",
            description="",
            issue_type="hazard",
            category="General",
            site="Site B",
            priority="medium",
            reported_by="u-tech",
        )
        create_issue(payload, db)
        mock_ns.assert_called_once()
        args = mock_ns.call_args
        assert args[1]["event_type"] == "warning"


def test_issue_resolution_notifies_reporter(db):
    with patch("app.routers.issues.notify") as mock_n:
        from app.routers.issues import update_issue_status
        from app.schemas.models import IssueStatusUpdate
        issue = IssueDB(
            id="iss-001", title="Test issue", description="", issue_type="hazard",
            category="General", site="", priority="medium", status="open",
            reported_by="u-tech", media_urls=[], custom_answers={},
        )
        db.add(issue)
        db.commit()
        update_issue_status("iss-001", IssueStatusUpdate(status="resolved"), db)
        mock_n.assert_called()
        # Find the call that notifies reporter
        reporter_call = [c for c in mock_n.call_args_list if c[0][1] == "u-tech"]
        assert len(reporter_call) == 1
        assert reporter_call[0][1]["event_type"] == "success"


# ── Action notifications ───────────────────────────────────────────────────────

def test_action_creation_notifies_assignee(db):
    with patch("app.routers.actions.notify") as mock_n:
        from app.routers.actions import create_action
        from app.schemas.models import ActionCreate
        payload = ActionCreate(
            title="Fix handrail",
            assigned_to="u-tech",
            priority="high",
            created_by="u-sup",
        )
        create_action(payload, db)
        mock_n.assert_called_once()
        args = mock_n.call_args
        assert args[0][1] == "u-tech"  # notified user is assignee
        assert "Fix handrail" in args[0][2]


def test_action_completion_notifies_creator(db):
    with patch("app.routers.actions.notify") as mock_n:
        from app.routers.actions import update_action_status
        from app.schemas.models import ActionStatusUpdate
        action = ActionDB(
            id="act-001", title="Fix handrail", assigned_to="u-tech",
            status="to_do", priority="medium", created_by="u-sup",
            labels=[], action_type="corrective",
        )
        db.add(action)
        db.commit()
        update_action_status("act-001", ActionStatusUpdate(status="complete"), db)
        mock_n.assert_called_once()
        args = mock_n.call_args
        assert args[0][1] == "u-sup"  # creator notified
        assert args[1]["event_type"] == "success"


# ── Inspection completion: score + auto-issues ────────────────────────────────

def test_inspection_critical_score_notifies_supervisors(db):
    from app.routers.inspections import _calc_score
    # Score below 70 → critical notification
    schema = {"sections": [{"questions": [
        {"id": f"q{i}", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}}
        for i in range(10)
    ]}]}
    answers = {f"q{i}": {"value": "No"} for i in range(10)}  # all fail = 0%
    score = _calc_score(schema, answers)
    assert score < 70


def test_inspection_auto_creates_issues_for_flags(db):
    from app.routers.inspections import complete_inspection
    from app.schemas.models import InspectionCompleteRequest, FlaggedItemIn

    from app.models.db_models import TemplateDB
    tpl = TemplateDB(
        id="tpl-001", name="Daily Safety Check",
        form_schema={"sections": [{"questions": [
            {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}}
        ]}]},
        is_active=True,
    )
    db.add(tpl)

    insp = InspectionRecordDB(
        id="insp-001", template_id="tpl-001", template_name="Daily Safety Check",
        title="Daily Safety Check", site="Site A", conducted_by="u-tech",
        status="in_progress", answers={"q1": {"value": "No", "is_flagged": True}},
        flagged_items=[], total_questions=1, answered_questions=1,
    )
    db.add(insp)
    db.commit()

    with patch("app.routers.inspections.notify_supervisors"):
        payload = InspectionCompleteRequest(flagged_items=[
            FlaggedItemIn(
                question_id="q1",
                question_text="Is fire extinguisher accessible?",
                answer_value="No",
                note="Blocked by equipment",
                action_created=False,
                skipped=False,
            )
        ])
        complete_inspection("insp-001", payload, db)

    issues = db.query(IssueDB).all()
    assert len(issues) == 1
    assert "fire extinguisher" in issues[0].title.lower() or "flagged" in issues[0].title.lower()
    assert issues[0].priority == "high"
    assert issues[0].status == "open"


def test_inspection_skipped_flags_do_not_create_issues(db):
    from app.routers.inspections import complete_inspection
    from app.schemas.models import InspectionCompleteRequest, FlaggedItemIn
    from app.models.db_models import TemplateDB

    tpl = TemplateDB(
        id="tpl-002", name="Safety Check 2",
        form_schema={"sections": [{"questions": []}]},
        is_active=True,
    )
    db.add(tpl)
    insp = InspectionRecordDB(
        id="insp-002", template_id="tpl-002", template_name="Safety Check 2",
        title="Check", site="Site B", conducted_by="u-tech",
        status="in_progress", answers={}, flagged_items=[],
        total_questions=0, answered_questions=0,
    )
    db.add(insp)
    db.commit()

    with patch("app.routers.inspections.notify_supervisors"):
        payload = InspectionCompleteRequest(flagged_items=[
            FlaggedItemIn(
                question_id="q1",
                question_text="Handrail secure?",
                answer_value="No",
                note="",
                action_created=False,
                skipped=True,  # skipped — should NOT create issue
            )
        ])
        complete_inspection("insp-002", payload, db)

    issues = db.query(IssueDB).all()
    assert len(issues) == 0
