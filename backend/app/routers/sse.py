import asyncio
import json
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Request, Query
from sse_starlette.sse import EventSourceResponse
from jose import JWTError, jwt

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/sse", tags=["sse"])

# In-memory list of active SSE queues: each entry is {"queue": asyncio.Queue, "user_id": str}
_connections: List[Dict] = []


async def broadcast_event(event_type: str, data: Dict[str, Any]):
    """Broadcast an SSE event to all connected clients."""
    message = json.dumps({"type": event_type, **data})
    dead_connections = []
    for conn in _connections:
        try:
            await conn["queue"].put(message)
        except Exception as e:
            logger.warning(f"Failed to put SSE event: {e}")
            dead_connections.append(conn)
    for conn in dead_connections:
        if conn in _connections:
            _connections.remove(conn)


@router.get("/updates")
async def sse_updates(
    request: Request,
    token: str = Query(...),
):
    """SSE endpoint. Token passed as query param since EventSource doesn't support headers."""
    user_id = None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        async def error_gen():
            yield {"data": json.dumps({"error": "Invalid token"})}
        return EventSourceResponse(error_gen())

    queue: asyncio.Queue = asyncio.Queue()
    conn = {"queue": queue, "user_id": user_id}
    _connections.append(conn)
    logger.info(f"SSE client connected: user_id={user_id}, total={len(_connections)}")

    async def event_generator():
        try:
            # Send initial connected event
            yield {"data": json.dumps({"type": "connected", "user_id": user_id})}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {"data": message}
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield {"data": json.dumps({"type": "ping"})}
        except asyncio.CancelledError:
            pass
        finally:
            if conn in _connections:
                _connections.remove(conn)
            logger.info(f"SSE client disconnected: user_id={user_id}, total={len(_connections)}")

    return EventSourceResponse(event_generator())
