from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    ticket_id: str
    agent_id: str
    field_changed: str
    old_value: str
    new_value: str
    changed_at: datetime
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True
