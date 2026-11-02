import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum as SAEnum, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class TicketStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class TicketCategory(str, enum.Enum):
    IT = "IT"
    HR = "HR"
    Finance = "Finance"
    Admin = "Admin"
    Other = "Other"


class TicketPriority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), nullable=False, default=TicketStatus.open)
    ai_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    agent_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    agent_priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    agent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    ai_draft_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["User"] = relationship("User", foreign_keys=[employee_id])  # noqa: F821
    agent: Mapped[Optional["User"]] = relationship("User", foreign_keys=[agent_id])  # noqa: F821
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="ticket")  # noqa: F821
