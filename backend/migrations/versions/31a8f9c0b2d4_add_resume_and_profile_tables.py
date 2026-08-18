"""Add resume and profile tables

Revision ID: 31a8f9c0b2d4
Revises: 205c4bfab43b
Create Date: 2026-08-18 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            if isinstance(value, str):
                return uuid.UUID(value)
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value


# revision identifiers, used by Alembic.
revision: str = '31a8f9c0b2d4'
down_revision: Union[str, Sequence[str], None] = '205c4bfab43b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to users
    try:
        op.add_column('users', sa.Column('is_public', sa.Boolean(), server_default='1', nullable=True))
    except Exception:
        pass

    # Add new columns to ideas
    try:
        op.add_column('ideas', sa.Column('maturity', sa.String(length=50), server_default='EARLY', nullable=True))
        op.add_column('ideas', sa.Column('parent_project_id', GUID(), nullable=True))
        op.add_column('ideas', sa.Column('skills_json', sa.Text(), nullable=True))
        op.add_column('ideas', sa.Column('domains_json', sa.Text(), nullable=True))
        op.add_column('ideas', sa.Column('notes_json', sa.Text(), nullable=True))
    except Exception:
        pass

    # Create resumes table
    op.create_table('resumes',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('target_role', sa.String(length=255), nullable=True),
        sa.Column('variant', sa.String(length=100), nullable=True),
        sa.Column('resume_format', sa.String(length=50), server_default='ats_clean', nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('skills_json', sa.JSON(), nullable=True),
        sa.Column('claims_json', sa.JSON(), nullable=True),
        sa.Column('projects_json', sa.JSON(), nullable=True),
        sa.Column('experience_json', sa.JSON(), nullable=True),
        sa.Column('education_json', sa.JSON(), nullable=True),
        sa.Column('certifications_json', sa.JSON(), nullable=True),
        sa.Column('links_json', sa.JSON(), nullable=True),
        sa.Column('visible_sections_json', sa.JSON(), nullable=True),
        sa.Column('section_order_json', sa.JSON(), nullable=True),
        sa.Column('is_primary', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create resume_versions table
    op.create_table('resume_versions',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('resume_id', GUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('change_summary', sa.String(length=255), nullable=True),
        sa.Column('snapshot_payload', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create work_experiences table
    op.create_table('work_experiences',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('start_date', sa.String(length=50), nullable=False),
        sa.Column('end_date', sa.String(length=50), server_default='Present', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('bullets', sa.JSON(), nullable=True),
        sa.Column('is_current', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('origin', sa.String(length=50), server_default='USER', nullable=True),
        sa.Column('status', sa.String(length=50), server_default='user_confirmed', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create educations table
    op.create_table('educations',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('institution', sa.String(length=255), nullable=False),
        sa.Column('degree', sa.String(length=255), nullable=False),
        sa.Column('field_of_study', sa.String(length=255), nullable=True),
        sa.Column('start_year', sa.String(length=20), nullable=True),
        sa.Column('end_year', sa.String(length=20), nullable=True),
        sa.Column('grade_or_gpa', sa.String(length=50), nullable=True),
        sa.Column('origin', sa.String(length=50), server_default='USER', nullable=True),
        sa.Column('status', sa.String(length=50), server_default='user_confirmed', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create certifications table
    op.create_table('certifications',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('issuer', sa.String(length=255), nullable=True),
        sa.Column('issue_date', sa.String(length=50), nullable=True),
        sa.Column('credential_url', sa.String(length=500), nullable=True),
        sa.Column('origin', sa.String(length=50), server_default='USER', nullable=True),
        sa.Column('status', sa.String(length=50), server_default='user_confirmed', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create social_links table
    op.create_table('social_links',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('social_links')
    op.drop_table('certifications')
    op.drop_table('educations')
    op.drop_table('work_experiences')
    op.drop_table('resume_versions')
    op.drop_table('resumes')
