from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.ticket import TicketStatus


class TicketCreate(BaseModel):
    title: str
    description: str
    attachment_filename: Optional[str] = None


class TicketOut(BaseModel):
    id: str
    title: str
    description: str
    attachment_filename: Optional[str]
    status: TicketStatus
    ai_category: Optional[str]
    ai_priority: Optional[str]
    ai_confidence: Optional[float] = None
    agent_category: Optional[str]
    agent_priority: Optional[str]
    employee_id: str
    agent_id: Optional[str]
    ai_draft_reply: Optional[str]
    final_reply: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    employee_name: Optional[str] = None
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True


class TicketReply(BaseModel):
    reply: str


class TicketOverride(BaseModel):
    ai_category: Optional[str] = None
    ai_priority: Optional[str] = None


class DraftReply(BaseModel):
    draft: str
    citations: List[str]
