from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.ticket import Ticket, TicketStatus
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import get_agent_user
from datetime import datetime

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
async def get_metrics(
    current_user: User = Depends(get_agent_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    # Tickets by status
    open_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.open)
    )
    open_count = open_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.resolved)
    )
    resolved_count = resolved_result.scalar() or 0

    # Tickets by category
    all_tickets_result = await db.execute(select(Ticket))
    all_tickets = all_tickets_result.scalars().all()

    category_counts: Dict[str, int] = {}
    resolution_times: List[float] = []
    ai_override_count = 0
    total_with_ai = 0

    for ticket in all_tickets:
        # Category counting (use agent_category if overridden, else ai_category)
        cat = ticket.agent_category or ticket.ai_category or "Other"
        category_counts[cat] = category_counts.get(cat, 0) + 1

        # Resolution time (in minutes)
        if ticket.resolved_at and ticket.created_at:
            delta = (ticket.resolved_at - ticket.created_at).total_seconds() / 60
            resolution_times.append(delta)

        # AI override check
        if ticket.ai_category or ticket.ai_priority:
            total_with_ai += 1
            if ticket.agent_category or ticket.agent_priority:
                ai_override_count += 1

    # Median resolution time
    if resolution_times:
        sorted_times = sorted(resolution_times)
        n = len(sorted_times)
        if n % 2 == 0:
            median_time = (sorted_times[n // 2 - 1] + sorted_times[n // 2]) / 2
        else:
            median_time = sorted_times[n // 2]
    else:
        median_time = 0

    # AI override percentage
    override_pct = (ai_override_count / total_with_ai * 100) if total_with_ai > 0 else 0

    return {
        "tickets_by_status": {"open": open_count, "resolved": resolved_count},
        "tickets_by_category": category_counts,
        "median_resolution_time_minutes": round(median_time, 2),
        "ai_override_percentage": round(override_pct, 2),
        "total_tickets": open_count + resolved_count,
    }
