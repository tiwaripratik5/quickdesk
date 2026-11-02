"""
Seed script for QuickDesk.
Run: python seed.py
"""
import asyncio
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import hash_password
from sqlalchemy import select


async def seed():
    print("Creating database tables...")
    async with engine.begin() as conn:
        # Import all models so Base knows about them
        from app.models import user, ticket, audit  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    async with AsyncSessionLocal() as session:
        # Check if agent already exists
        result = await session.execute(select(User).where(User.email == "agent@quickdesk.com"))
        existing_agent = result.scalar_one_or_none()

        if not existing_agent:
            agent = User(
                email="agent@quickdesk.com",
                password_hash=hash_password("Agent@123"),
                name="Support Agent",
                role=UserRole.agent,
            )
            session.add(agent)
            print("Created agent user: agent@quickdesk.com")
        else:
            print("Agent user already exists, skipping.")

        # Check if employee already exists
        result = await session.execute(select(User).where(User.email == "employee@quickdesk.com"))
        existing_employee = result.scalar_one_or_none()

        if not existing_employee:
            employee = User(
                email="employee@quickdesk.com",
                password_hash=hash_password("Employee@123"),
                name="John Employee",
                role=UserRole.employee,
            )
            session.add(employee)
            print("Created employee user: employee@quickdesk.com")
        else:
            print("Employee user already exists, skipping.")

        await session.commit()

    print("\n✅ Seed complete!")
    print("\n" + "="*40)
    print("CREDENTIALS")
    print("="*40)
    print("Agent:")
    print("  Email:    agent@quickdesk.com")
    print("  Password: Agent@123")
    print("\nEmployee:")
    print("  Email:    employee@quickdesk.com")
    print("  Password: Employee@123")
    print("="*40)

    # Initialize RAG
    print("\nInitializing RAG knowledge base index...")
    try:
        from app.services.rag_service import initialize_rag
        initialize_rag()
        print("✅ RAG index built successfully")
    except Exception as e:
        print(f"⚠️  RAG initialization warning: {e}")
        print("   (This is non-critical — RAG will initialize on first request)")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
