from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: Literal["technician", "supervisor", "admin", "view_only"]


class LoginResponse(BaseModel):
    token: str
    user: UserOut


class TemplateCreate(BaseModel):
    name: str
    category: str = "JSA"
    description: str = ""
    form_schema: dict = Field(default_factory=lambda: {"sections": []})


class TemplateOut(BaseModel):
    id: str
    name: str
    category: str
    description: str
    form_schema: dict = Field(default_factory=dict)


class JsaDraftCreate(BaseModel):
    job_number: str
    boat_name: str
    service_log_number: str
    location: str
    date: date


class JsaStepsUpdate(BaseModel):
    steps: list[str]


class JsaQuestionnaireUpdate(BaseModel):
    answers: dict[str, bool]


class HazardOut(BaseModel):
    hazard_id: int
    hazard_name: str
    controls: str
    ppe: str
    pre_likelihood: int
    pre_severity: int
    pre_score: int
    post_likelihood: int
    post_severity: int
    post_score: int


class AnalyzeResponse(BaseModel):
    hazards: list[HazardOut]
    ppe_list: list[str]


class JsaRecord(BaseModel):
    id: str
    job_number: str
    boat_name: str
    service_log_number: str
    location: str
    date: date
    status: Literal["draft", "pending_approval", "approved"]
    steps: list[str]
    answers: dict[str, bool]
    hazards: list[HazardOut]
    ppe_list: list[str]
    created_at: datetime
    summary_json_url: str | None = None
    summary_csv_url: str | None = None
    supervisor_signature: str | None = None
    approved_by: str | None = None


class ApproveRequest(BaseModel):
    signature: str
    supervisor_name: str = ""


class DocumentOut(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_path: str
    category: str
    folder: str
    description: str
    version: int
    uploaded_by: str


class SyncBatchItem(BaseModel):
    job_number: str
    boat_name: str
    service_log_number: str
    location: str
    date: date
    steps: list[str] = Field(default_factory=list)
    answers: dict[str, bool] = Field(default_factory=dict)


class SyncBatchRequest(BaseModel):
    created_by: str = "u-tech"
    items: list[SyncBatchItem]


class TeamCreate(BaseModel):
    name: str
    supervisor_id: str


class TeamOut(BaseModel):
    id: str
    name: str
    supervisor_id: str
    created_at: datetime


class TeamMemberCreate(BaseModel):
    team_id: str
    user_id: str
    role: Literal["technician", "supervisor"]


class TeamMemberOut(BaseModel):
    id: str
    team_id: str
    user_id: str
    role: str
    created_at: datetime


# ─── Enhanced Actions ────────────────────────────────────────────────────────

class ActionCreate(BaseModel):
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
    status: str


class ActionOut(BaseModel):
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
    user_id: str
    message: str


class ActionCommentOut(BaseModel):
    id: str
    action_id: str
    user_id: str
    message: str
    created_at: datetime


# ─── Issues ──────────────────────────────────────────────────────────────────

class IssueCreate(BaseModel):
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
    status: Literal["open", "in_progress", "resolved"]
    assigned_to: Optional[str] = None


class IssueOut(BaseModel):
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
    user_id: str
    message: str


class IssueCommentOut(BaseModel):
    id: str
    issue_id: str
    user_id: str
    message: str
    created_at: datetime


# ─── Scheduling ──────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
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
    completed_by: str
    jsa_id: Optional[str] = None


# ─── Inspections ─────────────────────────────────────────────────────────────

class InspectionStart(BaseModel):
    template_id: str
    title: str = ""
    site: str = ""
    conducted_by: str = "u-tech"


class AnswerPayload(BaseModel):
    value: Optional[str | float | bool | list] = None
    note: str = ""
    is_flagged: bool = False
    media_urls: list[str] = Field(default_factory=list)


class InspectionAnswersUpdate(BaseModel):
    answers: dict[str, AnswerPayload]


class FlaggedItemIn(BaseModel):
    question_id: str
    question_text: str
    answer_value: str
    note: str = ""
    action_created: bool = False
    skipped: bool = False


class InspectionCompleteRequest(BaseModel):
    flagged_items: list[FlaggedItemIn] = Field(default_factory=list)


class InspectionOut(BaseModel):
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
    pdf_url: Optional[str]


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: str
    message: str


class NotificationOut(BaseModel):
    id: str
    user_id: str
    message: str
    is_read: bool
    created_at: datetime


# ─── Audit Logs ──────────────────────────────────────────────────────────────

class AuditLogCreate(BaseModel):
    user_id: str
    action: str
    resource: str
    details: dict | None = None


class AuditLogOut(BaseModel):
    id: str
    user_id: str
    action: str
    resource: str
    timestamp: datetime
    details: dict | None
