from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Schema for user login credentials."""

    email: EmailStr
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    """Schema for returning user data in responses."""

    id: str
    email: EmailStr
    full_name: str
    role: Literal["technician", "supervisor", "admin", "view_only"]


class LoginResponse(BaseModel):
    """Schema for the login response containing token and user info."""

    token: str
    user: UserOut


class TemplateCreate(BaseModel):
    """Schema for creating a new JSA template."""

    name: str
    category: str = "JSA"
    description: str = ""
    form_schema: dict = Field(default_factory=lambda: {"sections": []})


class TemplateOut(BaseModel):
    """Schema for returning template data in responses."""

    id: str
    name: str
    category: str
    description: str
    form_schema: dict = Field(default_factory=dict)


class TemplateUpdate(BaseModel):
    """Schema for partially updating an existing template."""

    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    form_schema: Optional[dict] = None


class DocumentOut(BaseModel):
    """Schema for returning document metadata in responses."""

    id: str
    filename: str
    original_filename: str
    file_path: str
    category: str
    folder: str
    description: str
    version: int
    uploaded_by: str


class TeamCreate(BaseModel):
    """Schema for creating a new team with an assigned supervisor."""

    name: str
    supervisor_id: str


class TeamOut(BaseModel):
    """Schema for returning team data in responses."""

    id: str
    name: str
    supervisor_id: str
    created_at: datetime


class TeamMemberCreate(BaseModel):
    """Schema for adding a member to a team with a specified role."""

    team_id: str
    user_id: str
    role: Literal["technician", "supervisor"]


class TeamMemberOut(BaseModel):
    """Schema for returning team membership data in responses."""

    id: str
    team_id: str
    user_id: str
    role: str
    created_at: datetime


# ─── Enhanced Actions ────────────────────────────────────────────────────────

class ActionCreate(BaseModel):
    """Schema for creating a new corrective or preventive action."""

    title: str
    description: Optional[str] = None
    assigned_to: str
    priority: Literal["high", "medium", "low"] = "medium"
    due_date: Optional[date] = None
    labels: list[str] = Field(default_factory=list)
    action_type: str = "corrective"
    linked_issue_id: Optional[str] = None
    linked_jsa_id: Optional[str] = None
    created_by: str = "u-tech"


class ActionStatusUpdate(BaseModel):
    """Schema for updating the status of an action."""

    status: str


class ActionOut(BaseModel):
    """Schema for returning action data in responses."""

    id: str
    title: str
    description: Optional[str]
    assigned_to: str
    status: str
    priority: str
    due_date: Optional[date]
    labels: list[str]
    action_type: str
    linked_issue_id: Optional[str]
    linked_jsa_id: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]


class ActionCommentCreate(BaseModel):
    """Schema for adding a comment to an action."""

    user_id: str
    message: str


class ActionCommentOut(BaseModel):
    """Schema for returning action comment data in responses."""

    id: str
    action_id: str
    user_id: str
    message: str
    created_at: datetime


# ─── Issues ──────────────────────────────────────────────────────────────────

class IssueCreate(BaseModel):
    """Schema for reporting a new safety issue or hazard."""

    title: str
    description: str = ""
    issue_type: Literal["hazard", "near_miss", "observation", "incident", "positive", "maintenance"] = "hazard"
    category: str = "General"
    site: str = ""
    priority: Literal["high", "medium", "low"] = "medium"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    custom_answers: dict = Field(default_factory=dict)
    reported_by: str = "u-tech"
    linked_jsa_id: Optional[str] = None


class IssueStatusUpdate(BaseModel):
    """Schema for updating the status and assignment of an issue."""

    status: Literal["open", "in_progress", "resolved"]
    assigned_to: Optional[str] = None


class IssueOut(BaseModel):
    """Schema for returning issue data in responses."""

    id: str
    title: str
    description: str
    issue_type: str
    category: str
    site: str
    priority: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    media_urls: list[str]
    custom_answers: dict
    reported_by: str
    assigned_to: Optional[str]
    linked_jsa_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime]


class IssueCommentCreate(BaseModel):
    """Schema for adding a comment to an issue."""

    user_id: str
    message: str


class IssueCommentOut(BaseModel):
    """Schema for returning issue comment data in responses."""

    id: str
    issue_id: str
    user_id: str
    message: str
    created_at: datetime


# ─── Scheduling ──────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    """Schema for creating a recurring inspection schedule."""

    title: str
    template_id: str
    template_name: str = ""
    frequency: Literal["daily", "weekly", "monthly"] = "weekly"
    frequency_value: int = 1
    start_date: date
    end_date: Optional[date] = None
    site: str = ""
    assigned_users: list[str] = Field(default_factory=list)
    created_by: str = "u-admin"


class ScheduleOut(BaseModel):
    """Schema for returning schedule data in responses."""

    id: str
    title: str
    template_id: str
    template_name: str
    frequency: str
    frequency_value: int
    start_date: date
    end_date: Optional[date]
    site: str
    assigned_users: list[str]
    is_active: bool
    created_by: str
    created_at: datetime


class OccurrenceOut(BaseModel):
    """Schema for returning a scheduled occurrence instance in responses."""

    id: str
    schedule_id: str
    schedule_title: str
    due_date: date
    status: str
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    jsa_id: Optional[str]
    created_at: datetime


class OccurrenceComplete(BaseModel):
    """Schema for marking a schedule occurrence as completed."""

    completed_by: str
    jsa_id: Optional[str] = None


# ─── Inspections ─────────────────────────────────────────────────────────────

class InspectionStart(BaseModel):
    """Schema for initiating a new inspection session."""

    template_id: str
    title: str = ""
    site: str = ""
    conducted_by: str = "u-tech"


class AnswerPayload(BaseModel):
    """Schema for a single inspection question answer with optional media and flags."""

    value: Optional[str | float | bool | list] = None
    note: str = ""
    is_flagged: bool = False
    media_urls: list[str] = Field(default_factory=list)


class InspectionAnswersUpdate(BaseModel):
    """Schema for submitting a batch of answers for an inspection."""

    answers: dict[str, AnswerPayload]


class FlaggedItemIn(BaseModel):
    """Schema for a flagged inspection item requiring follow-up."""

    question_id: str
    question_text: str
    answer_value: str
    note: str = ""
    action_created: bool = False
    skipped: bool = False


class InspectionCompleteRequest(BaseModel):
    """Schema for completing an inspection with a list of flagged items."""

    flagged_items: list[FlaggedItemIn] = Field(default_factory=list)


class InspectionApproveRequest(BaseModel):
    """Schema for approving a completed inspection with an optional signature."""

    approved_by: str
    signature: Optional[str] = None


class InspectionOut(BaseModel):
    """Schema for returning full inspection data in responses."""

    id: str
    template_id: str
    template_name: str
    title: str
    site: str
    conducted_by: str
    status: str
    answers: dict
    flagged_items: list
    score: Optional[float]
    total_questions: int
    answered_questions: int
    started_at: datetime
    completed_at: Optional[datetime]
    approved_by: Optional[str]
    supervisor_signature: Optional[str] = None
    pdf_url: Optional[str]


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    """Schema for creating a new user notification."""

    user_id: str
    message: str
    event_type: str = "info"
    link: str = ""


class NotificationOut(BaseModel):
    """Schema for returning notification data in responses."""

    id: str
    user_id: str
    message: str
    event_type: str = "info"
    link: str = ""
    is_read: bool
    created_at: datetime


# ─── Audit Logs ──────────────────────────────────────────────────────────────

class AuditLogCreate(BaseModel):
    """Schema for recording a new audit log entry."""

    user_id: str
    action: str
    resource: str
    details: dict | None = None


class AuditLogOut(BaseModel):
    """Schema for returning audit log data in responses."""

    id: str
    user_id: str
    action: str
    resource: str
    timestamp: datetime
    details: dict | None
