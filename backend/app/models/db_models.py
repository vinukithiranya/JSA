from datetime import date, datetime
from sqlalchemy import JSON, Boolean, Date, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserDB(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TemplateDB(Base):
    __tablename__ = "form_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(100), default="JSA")
    description: Mapped[str] = mapped_column(Text, default="")
    form_schema: Mapped[dict] = mapped_column(JSON, default={})
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class JsaRecordDB(Base):
    __tablename__ = "jsa_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    job_number: Mapped[str] = mapped_column(String(50), index=True)
    boat_name: Mapped[str] = mapped_column(String(255))
    service_log_number: Mapped[str] = mapped_column(String(50), index=True)
    location: Mapped[str] = mapped_column(String(255))
    date: Mapped[str] = mapped_column(Date)
    work_steps: Mapped[list] = mapped_column(JSON, default=[])
    questionnaire_answers: Mapped[dict] = mapped_column(JSON, default={})
    hazards: Mapped[list] = mapped_column(JSON, default=[])
    ppe_list: Mapped[list] = mapped_column(JSON, default=[])
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    supervisor_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(String(64), default="u-tech")
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    supervisor_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_json_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_csv_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DocumentDB(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(100), default="SOP")
    folder: Mapped[str] = mapped_column(String(255), default="General")
    description: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    tags: Mapped[list[str]] = mapped_column(JSON, default=[])
    uploaded_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    upload_date: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TeamDB(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    supervisor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TeamMemberDB(Base):
    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ActionDB(Base):
    __tablename__ = "actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="to_do")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    labels: Mapped[list] = mapped_column(JSON, default=[])
    action_type: Mapped[str] = mapped_column(String(100), default="corrective")
    linked_issue_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    linked_jsa_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), default="u-tech")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


class ActionCommentDB(Base):
    __tablename__ = "action_comments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    action_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IssueDB(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    issue_type: Mapped[str] = mapped_column(String(50), default="hazard")
    category: Mapped[str] = mapped_column(String(100), default="General")
    site: Mapped[str] = mapped_column(String(255), default="")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(50), default="open", index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    media_urls: Mapped[list] = mapped_column(JSON, default=[])
    custom_answers: Mapped[dict] = mapped_column(JSON, default={})
    reported_by: Mapped[str] = mapped_column(String(64), default="u-tech")
    assigned_to: Mapped[str | None] = mapped_column(String(64), nullable=True)
    linked_jsa_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IssueCommentDB(Base):
    __tablename__ = "issue_comments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    issue_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScheduleDB(Base):
    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False)
    template_name: Mapped[str] = mapped_column(String(255), default="")
    frequency: Mapped[str] = mapped_column(String(20), default="weekly")
    frequency_value: Mapped[int] = mapped_column(Integer, default=1)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    site: Mapped[str] = mapped_column(String(255), default="")
    assigned_users: Mapped[list] = mapped_column(JSON, default=[])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScheduleOccurrenceDB(Base):
    __tablename__ = "schedule_occurrences"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    schedule_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    schedule_title: Mapped[str] = mapped_column(String(255), default="")
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jsa_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InspectionRecordDB(Base):
    __tablename__ = "inspection_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    template_name: Mapped[str] = mapped_column(String(255), default="")
    title: Mapped[str] = mapped_column(String(255), default="")
    site: Mapped[str] = mapped_column(String(255), default="")
    conducted_by: Mapped[str] = mapped_column(String(64), default="u-tech")
    status: Mapped[str] = mapped_column(String(50), default="in_progress", index=True)
    # answers: {question_id: {value, note, is_flagged, media_urls}}
    answers: Mapped[dict] = mapped_column(JSON, default={})
    # flagged_items: [{question_id, question_text, answer_value, note, action_created, skipped}]
    flagged_items: Mapped[list] = mapped_column(JSON, default=[])
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    answered_questions: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    supervisor_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class NotificationDB(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), default="info")
    link: Mapped[str] = mapped_column(String(500), default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    details: Mapped[dict] = mapped_column(JSON, default={})


class AssetDB(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_number: Mapped[str] = mapped_column(String(100), default="")
    asset_type: Mapped[str] = mapped_column(String(100), default="Equipment")
    make: Mapped[str] = mapped_column(String(255), default="")
    model_name: Mapped[str] = mapped_column(String(255), default="")
    serial_number: Mapped[str] = mapped_column(String(100), default="")
    site: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(50), default="active")
    description: Mapped[str] = mapped_column(Text, default="")
    readings: Mapped[list] = mapped_column(JSON, default=[])
    created_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContractorDB(Base):
    __tablename__ = "contractors"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), default="")
    contact_email: Mapped[str] = mapped_column(String(255), default="")
    contact_phone: Mapped[str] = mapped_column(String(50), default="")
    abn: Mapped[str] = mapped_column(String(50), default="")
    status: Mapped[str] = mapped_column(String(50), default="active")
    trade_type: Mapped[str] = mapped_column(String(100), default="")
    site: Mapped[str] = mapped_column(String(255), default="")
    documents: Mapped[list] = mapped_column(JSON, default=[])
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InvestigationDB(Base):
    __tablename__ = "investigations"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    incident_date: Mapped[date] = mapped_column(Date, nullable=False)
    incident_type: Mapped[str] = mapped_column(String(100), default="near_miss")
    severity: Mapped[str] = mapped_column(String(50), default="medium")
    site: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    involved_parties: Mapped[list] = mapped_column(JSON, default=[])
    immediate_actions: Mapped[str] = mapped_column(Text, default="")
    root_causes: Mapped[list] = mapped_column(JSON, default=[])
    corrective_actions: Mapped[list] = mapped_column(JSON, default=[])
    media_urls: Mapped[list] = mapped_column(JSON, default=[])
    linked_issue_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    linked_inspection_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="open")
    created_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class HeadsUpDB(Base):
    __tablename__ = "headsup"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    author_id: Mapped[str] = mapped_column(String(64), default="u-admin")
    author_name: Mapped[str] = mapped_column(String(255), default="")
    sites: Mapped[list] = mapped_column(JSON, default=[])
    attachments: Mapped[list] = mapped_column(JSON, default=[])
    acknowledgments: Mapped[list] = mapped_column(JSON, default=[])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CredentialDB(Base):
    __tablename__ = "credentials"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), default="")
    credential_type: Mapped[str] = mapped_column(String(100), nullable=False)
    credential_number: Mapped[str] = mapped_column(String(100), default="")
    issuing_authority: Mapped[str] = mapped_column(String(255), default="")
    issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
