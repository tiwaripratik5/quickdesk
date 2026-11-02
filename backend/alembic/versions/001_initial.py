"""Initial migration - create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('employee', 'agent', name='userrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create tickets table
    op.create_table(
        'tickets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('attachment_filename', sa.String(500), nullable=True),
        sa.Column('status', sa.Enum('open', 'resolved', name='ticketstatus'), nullable=False),
        sa.Column('ai_category', sa.String(50), nullable=True),
        sa.Column('ai_priority', sa.String(50), nullable=True),
        sa.Column('agent_category', sa.String(50), nullable=True),
        sa.Column('agent_priority', sa.String(50), nullable=True),
        sa.Column('employee_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('agent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('ai_draft_reply', sa.Text(), nullable=True),
        sa.Column('final_reply', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ticket_id', sa.String(36), sa.ForeignKey('tickets.id'), nullable=False),
        sa.Column('agent_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('field_changed', sa.String(50), nullable=False),
        sa.Column('old_value', sa.String(100), nullable=False),
        sa.Column('new_value', sa.String(100), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('tickets')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS ticketstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
