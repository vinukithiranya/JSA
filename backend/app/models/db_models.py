from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

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


# Updating JSA Record model for Draft/Revision workflow
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
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_json_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_csv_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Updating Document model for versioning and tags
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


# Adding Teams and Departments models
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


# Adding Actions model
class ActionDB(Base):
    __tablename__ = "actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())


# Adding Notifications model
class NotificationDB(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Adding Audit Trail model
class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    details: Mapped[dict] = mapped_column(JSON, default={})
