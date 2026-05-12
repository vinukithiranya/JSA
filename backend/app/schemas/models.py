from datetime import date, datetime
from typing import Literal

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


# Adding schemas for Teams and Team Members
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


# Adding schemas for Actions
class ActionCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_to: str


class ActionOut(BaseModel):
    id: str
    title: str
    description: str | None
    assigned_to: str
    status: str
    created_at: datetime
    updated_at: datetime | None


# Adding schemas for Notifications
class NotificationCreate(BaseModel):
    user_id: str
    message: str


class NotificationOut(BaseModel):
    id: str
    user_id: str
    message: str
    is_read: bool
    created_at: datetime


# Adding schemas for Audit Logs
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
