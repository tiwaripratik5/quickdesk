import logging
import sys
import asyncio
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_tables
from app.routers import auth, tickets, agents, metrics, sse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting QuickDesk API...")
    await create_tables()
    # Initialize RAG index in background
    import asyncio
    from app.services.rag_service import initialize_rag
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, initialize_rag)
    logger.info("QuickDesk API started successfully")
    yield
    logger.info("Shutting down QuickDesk API...")


app = FastAPI(
    title="QuickDesk API",
    description="AI-assisted helpdesk API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(agents.router)
app.include_router(metrics.router)
app.include_router(sse.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "QuickDesk API"}
