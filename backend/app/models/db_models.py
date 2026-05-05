from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, String, Text, func
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
    created_by: Mapped[str] = mapped_column(String(64), default="u-tech")
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
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
    uploaded_by: Mapped[str] = mapped_column(String(64), default="u-admin")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    upload_date: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
