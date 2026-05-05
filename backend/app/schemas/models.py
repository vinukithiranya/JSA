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
