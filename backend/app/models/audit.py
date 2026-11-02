import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    field_changed: Mapped[str] = mapped_column(String(50), nullable=False)  # "category" or "priority"
    old_value: Mapped[str] = mapped_column(String(100), nullable=False)
    new_value: Mapped[str] = mapped_column(String(100), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="audit_logs")  # noqa: F821
    agent: Mapped["User"] = relationship("User", foreign_keys=[agent_id])  # noqa: F821
