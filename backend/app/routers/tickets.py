from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketOut
from app.services.auth_service import get_current_user
from app.services.llm_service import suggest_category_and_priority
from app.routers.sse import broadcast_event

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def _ticket_to_out(ticket: Ticket) -> TicketOut:
    out = TicketOut.model_validate(ticket)
    if ticket.employee:
        out.employee_name = ticket.employee.name
    if ticket.agent:
        out.agent_name = ticket.agent.name
    return out


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get AI suggestions with confidence score
    category, priority, confidence = await suggest_category_and_priority(payload.title, payload.description)

    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        attachment_filename=payload.attachment_filename,
        employee_id=current_user.id,
        ai_category=category,
        ai_priority=priority,
        ai_confidence=confidence,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Load relationships
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket.id)
    )
    ticket = result.scalar_one()
    # Load employee
    emp_result = await db.execute(select(User).where(User.id == ticket.employee_id))
    ticket.employee = emp_result.scalar_one_or_none()

    # Broadcast SSE event to agents
    await broadcast_event("new_ticket", {
        "ticket_id": ticket.id,
        "title": ticket.title,
        "ai_category": ticket.ai_category,
        "ai_priority": ticket.ai_priority,
    })

    out = TicketOut.model_validate(ticket)
    if ticket.employee:
        out.employee_name = ticket.employee.name
    return out


@router.get("/my", response_model=List[TicketOut])
async def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).where(Ticket.employee_id == current_user.id).order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()

    outs = []
    for ticket in tickets:
        emp_result = await db.execute(select(User).where(User.id == ticket.employee_id))
        ticket.employee = emp_result.scalar_one_or_none()
        if ticket.agent_id:
            ag_result = await db.execute(select(User).where(User.id == ticket.agent_id))
            ticket.agent = ag_result.scalar_one_or_none()
        out = TicketOut.model_validate(ticket)
        if ticket.employee:
            out.employee_name = ticket.employee.name
        if hasattr(ticket, 'agent') and ticket.agent:
            out.agent_name = ticket.agent.name
        outs.append(out)
    return outs
