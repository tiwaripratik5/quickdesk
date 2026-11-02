from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus
from app.models.audit import AuditLog
from app.schemas.ticket import TicketOut, TicketReply, TicketOverride, DraftReply
from app.schemas.audit import AuditLogOut
from app.services.auth_service import get_agent_user
from app.services.rag_service import generate_draft_reply
from app.routers.sse import broadcast_event

router = APIRouter(prefix="/api/agent", tags=["agent"])


async def _load_ticket(ticket_id: str, db: AsyncSession) -> Ticket:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


async def _enrich_ticket(ticket: Ticket, db: AsyncSession) -> TicketOut:
    emp_result = await db.execute(select(User).where(User.id == ticket.employee_id))
    employee = emp_result.scalar_one_or_none()
    ticket.employee = employee

    if ticket.agent_id:
        ag_result = await db.execute(select(User).where(User.id == ticket.agent_id))
        ticket.agent = ag_result.scalar_one_or_none()

    out = TicketOut.model_validate(ticket)
    if employee:
        out.employee_name = employee.name
    if ticket.agent_id and hasattr(ticket, 'agent') and ticket.agent:
        out.agent_name = ticket.agent.name
    return out


@router.get("/tickets", response_model=List[TicketOut])
async def get_all_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Ticket).order_by(Ticket.created_at.desc())

    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if category:
        query = query.where(
            or_(Ticket.ai_category == category, Ticket.agent_category == category)
        )
    if priority:
        query = query.where(
            or_(Ticket.ai_priority == priority, Ticket.agent_priority == priority)
        )
    if search:
        query = query.where(Ticket.title.ilike(f"%{search}%"))

    result = await db.execute(query)
    tickets = result.scalars().all()

    outs = []
    for ticket in tickets:
        out = await _enrich_ticket(ticket, db)
        outs.append(out)
    return outs


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_ticket_detail(
    ticket_id: str,
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await _load_ticket(ticket_id, db)
    return await _enrich_ticket(ticket, db)


@router.post("/tickets/{ticket_id}/reply", response_model=TicketOut)
async def send_reply(
    ticket_id: str,
    payload: TicketReply,
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await _load_ticket(ticket_id, db)
    ticket.final_reply = payload.reply
    ticket.status = TicketStatus.resolved
    ticket.agent_id = current_user.id
    ticket.resolved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(ticket)

    # Broadcast SSE event to employee
    await broadcast_event("ticket_resolved", {
        "ticket_id": ticket.id,
        "employee_id": ticket.employee_id,
        "final_reply": ticket.final_reply,
    })

    return await _enrich_ticket(ticket, db)


@router.patch("/tickets/{ticket_id}/override", response_model=TicketOut)
async def override_ticket(
    ticket_id: str,
    payload: TicketOverride,
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await _load_ticket(ticket_id, db)

    if payload.ai_category is not None:
        old_value = ticket.agent_category or ticket.ai_category or "None"
        new_value = payload.ai_category
        if old_value != new_value:
            audit = AuditLog(
                ticket_id=ticket.id,
                agent_id=current_user.id,
                field_changed="category",
                old_value=old_value,
                new_value=new_value,
            )
            db.add(audit)
            ticket.agent_category = new_value

    if payload.ai_priority is not None:
        old_value = ticket.agent_priority or ticket.ai_priority or "None"
        new_value = payload.ai_priority
        if old_value != new_value:
            audit = AuditLog(
                ticket_id=ticket.id,
                agent_id=current_user.id,
                field_changed="priority",
                old_value=old_value,
                new_value=new_value,
            )
            db.add(audit)
            ticket.agent_priority = new_value

    await db.commit()
    await db.refresh(ticket)
    return await _enrich_ticket(ticket, db)


@router.get("/tickets/{ticket_id}/draft", response_model=DraftReply)
async def get_draft_reply(
    ticket_id: str,
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await _load_ticket(ticket_id, db)
    draft, citations = await generate_draft_reply(ticket.title, ticket.description)

    # Store the draft in the ticket
    ticket.ai_draft_reply = draft
    await db.commit()

    return DraftReply(draft=draft, citations=citations)


@router.get("/tickets/{ticket_id}/audit", response_model=List[AuditLogOut])
async def get_audit_logs(
    ticket_id: str,
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog).where(AuditLog.ticket_id == ticket_id).order_by(AuditLog.changed_at.asc())
    )
    logs = result.scalars().all()

    outs = []
    for log in logs:
        ag_result = await db.execute(select(User).where(User.id == log.agent_id))
        agent = ag_result.scalar_one_or_none()
        out = AuditLogOut.model_validate(log)
        if agent:
            out.agent_name = agent.name
        outs.append(out)
    return outs
