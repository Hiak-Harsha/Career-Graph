import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Float, Integer, Date, Table, JSON, Boolean
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

def utc_today():
    return datetime.now(timezone.utc).date()

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise CHAR(36), storing as stringified UUID.
    """
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
            return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)

# Junction Table: Project-Skills
project_skills = Table(
    "project_skills",
    Base.metadata,
    Column("project_id", GUID, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", GUID, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
    Column("relationship", String(100), default="USES"),
    Column("confidence", Float, default=1.0),
    Column("evidence_strength", Float, default=1.0),
    Column("origin", String(50), default="DETERMINISTIC"),  # DETERMINISTIC, AI_PROPOSED
    Column("status", String(50), default="user_confirmed")  # ai_suggested, user_confirmed, user_rejected
)

# Junction Table: Project-Domains
project_domains = Table(
    "project_domains",
    Base.metadata,
    Column("project_id", GUID, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("domain_id", GUID, ForeignKey("domains.id", ondelete="CASCADE"), primary_key=True),
    Column("confidence", Float, default=1.0),
    Column("relevance", Float, default=1.0),
    Column("origin", String(50), default="AI_PROPOSED"),  # DETERMINISTIC, AI_PROPOSED
    Column("status", String(50), default="ai_suggested")  # ai_suggested, user_confirmed, user_rejected
)

# Junction Table: Claim-Evidence
claim_evidence = Table(
    "claim_evidence",
    Base.metadata,
    Column("claim_id", GUID, ForeignKey("claims.id", ondelete="CASCADE"), primary_key=True),
    Column("evidence_id", GUID, ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True),
    Column("relationship", String(100), default="PROVES")
)


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    headline = Column(String(255))
    bio = Column(Text)
    location = Column(String(255))
    phone = Column(String(50))
    education = Column(Text)
    career_goal = Column(Text)
    github_username = Column(String(255), unique=True)
    github_access_token = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="user", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="user", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="user", cascade="all, delete-orphan")
    domain_progress = relationship("DomainProgress", back_populates="user", cascade="all, delete-orphan")
    skill_progress = relationship("SkillProgress", back_populates="user", cascade="all, delete-orphan")
    snapshots = relationship("CareerSnapshot", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    work_experiences = relationship("WorkExperience", back_populates="user", cascade="all, delete-orphan")
    educations = relationship("Education", back_populates="user", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="user", cascade="all, delete-orphan")
    social_links = relationship("SocialLink", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="ACTIVE")  # IDEA, EXPLORING, PLANNED, ACTIVE, COMPLETED, MAINTAINED, PAUSED
    project_type = Column(String(50), default="PERSONAL")  # PERSONAL, ACADEMIC, RESEARCH, PROFESSIONAL, HACKATHON
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    repository_url = Column(String(500))
    demo_url = Column(String(500))
    complexity_score = Column(Float, default=0.0)
    individual_or_team = Column(String(50), default="INDIVIDUAL")
    sync_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="projects")
    evidence = relationship("Evidence", back_populates="project", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="project", cascade="all, delete-orphan")
    skills = relationship("Skill", secondary=project_skills, back_populates="projects")
    domains = relationship("Domain", secondary=project_domains, back_populates="projects")
    ai_inferences = relationship("AIInference", back_populates="project", cascade="all, delete-orphan")


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    potential_impact = Column(String(50), default="MEDIUM")  # LOW, MEDIUM, HIGH
    status = Column(String(50), default="EXPLORING")  # EXPLORING, RAW, REFINED, READY_TO_BUILD, CONVERTED
    maturity = Column(String(50), default="EARLY")  # SPARK, EARLY, DEVELOPING, MATURE, CONVERTED
    parent_project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    converted_to_project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    skills_json = Column(JSON, default=list)
    domains_json = Column(JSON, default=list)
    notes_json = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="ideas")



class Skill(Base):
    __tablename__ = "skills"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    category = Column(String(50), default="LIBRARY")  # LANGUAGE, FRAMEWORK, LIBRARY, TOOL, CONCEPT, ARCHITECTURE
    created_by = Column(String(50), default="DETERMINISTIC")  # DETERMINISTIC, AI, USER
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    projects = relationship("Project", secondary=project_skills, back_populates="skills")
    skill_progress = relationship("SkillProgress", back_populates="skill", cascade="all, delete-orphan")
    role_requirements = relationship("RoleRequirement", back_populates="skill", cascade="all, delete-orphan")


class Domain(Base):
    __tablename__ = "domains"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    parent_domain_id = Column(GUID, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(String(50), default="AI")  # DETERMINISTIC, AI, USER
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    projects = relationship("Project", secondary=project_domains, back_populates="domains")
    domain_progress = relationship("DomainProgress", back_populates="domain", cascade="all, delete-orphan")
    role_requirements = relationship("RoleRequirement", back_populates="domain", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(50), nullable=False, default="DOCUMENT")  # COMMIT, PR, FILE, DOCUMENT, README, DEMO_URL
    source = Column(String(100), default="github")
    source_url = Column(String(500))
    source_identifier = Column(String(255))
    content = Column(Text)
    confidence = Column(Float, default=1.0)
    metadata_json = Column(JSON)  # stores metrics, commit hashes, etc.
    hash = Column(String(255), unique=True)
    verified = Column(Boolean, default=True)
    captured_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="evidence")
    project = relationship("Project", back_populates="evidence")
    claims = relationship("Claim", secondary=claim_evidence, back_populates="evidence")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(50), default="COMMIT")  # COMMIT, PR, ISSUE, MERGE, DEMO_RUN
    activity_type = Column(String(50), nullable=True)
    source = Column(String(100), default="github")
    source_id = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    activity_metadata = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Claim(Base):
    __tablename__ = "claims"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    claim = Column(Text, nullable=False)
    claim_type = Column(String(50), default="TECHNICAL_ACHIEVEMENT")  # ARCHITECTURE, PERFORMANCE, SCALE, INNOVATION
    confidence = Column(Float, default=1.0)
    origin = Column(String(50), default="DETERMINISTIC")  # DETERMINISTIC, AI_PROPOSED, USER_DECLARED
    status = Column(String(50), default="user_confirmed")  # ai_suggested, user_confirmed, user_rejected
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="claims")
    project = relationship("Project", back_populates="claims")
    evidence = relationship("Evidence", secondary=claim_evidence, back_populates="claims")


class DomainProgress(Base):
    __tablename__ = "domain_progress"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    domain_id = Column(GUID, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    exposure_score = Column(Float, default=0.0)
    activity_score = Column(Float, default=0.0)
    evidence_score = Column(Float, default=0.0)
    depth_score = Column(Float, default=0.0)
    recency_score = Column(Float, default=0.0)
    current_level = Column(String(50), default="EXPOSURE")  # EXPOSURE, PRACTICING, DEVELOPING, PROFICIENT, STRONG, ADVANCED
    trajectory = Column(String(50), default="STABLE")  # DECREASING, STABLE, INCREASING
    first_detected = Column(DateTime(timezone=True))
    last_active = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="domain_progress")
    domain = relationship("Domain", back_populates="domain_progress")


class SkillProgress(Base):
    __tablename__ = "skill_progress"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(GUID, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    evidence_count = Column(Integer, default=0)
    usage_frequency = Column(Float, default=0.0)
    depth_score = Column(Float, default=0.0)
    recency_score = Column(Float, default=0.0)
    confidence = Column(Float, default=1.0)
    trajectory = Column(String(50), default="STABLE")  # DECREASING, STABLE, INCREASING
    current_level = Column(String(50), default="EXPOSURE")  # EXPOSURE, PRACTICING, PROFICIENT, STRONG, ADVANCED
    first_seen = Column(DateTime(timezone=True))
    last_used = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="skill_progress")
    skill = relationship("Skill", back_populates="skill_progress")


class CareerSnapshot(Base):
    __tablename__ = "career_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    snapshot_date = Column(Date, default=utc_today)
    dominant_domains = Column(JSON)  # stores list of dominant domains
    emerging_domains = Column(JSON)  # stores list of emerging domains
    strongest_skills = Column(JSON)  # stores list of strongest skills
    active_projects = Column(JSON)  # stores list of active projects
    career_direction = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="snapshots")


class Role(Base):
    __tablename__ = "roles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    role_requirements = relationship("RoleRequirement", back_populates="role", cascade="all, delete-orphan")


class RoleRequirement(Base):
    __tablename__ = "role_requirements"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    role_id = Column(GUID, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(GUID, ForeignKey("skills.id", ondelete="CASCADE"), nullable=True)
    domain_id = Column(GUID, ForeignKey("domains.id", ondelete="CASCADE"), nullable=True)
    importance = Column(Float, default=0.5)

    # Relationships
    role = relationship("Role", back_populates="role_requirements")
    skill = relationship("Skill", back_populates="role_requirements")
    domain = relationship("Domain", back_populates="role_requirements")


class AIInference(Base):
    __tablename__ = "ai_inferences"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    prompt_type = Column(String(255), nullable=False)  # e.g., 'openai_extraction', 'anthropic_reasoning'
    content_hash = Column(String(255), nullable=True, index=True)
    input_payload = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    project = relationship("Project", back_populates="ai_inferences")


# --- New Persisted Resume & Career History Models ---

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, default="Master Resume")
    target_role = Column(String(255), nullable=False, default="Software Engineer")
    variant = Column(String(50), nullable=False, default="visual")  # 'ats' or 'visual'
    resume_format = Column(String(20), nullable=False, default="ats_clean")  # 'ats_clean' or 'visual'
    summary = Column(Text, nullable=False, default="")
    skills_json = Column(JSON, default=list)
    claims_json = Column(JSON, default=list)
    projects_json = Column(JSON, default=list)
    experience_json = Column(JSON, default=list)
    education_json = Column(JSON, default=list)
    certifications_json = Column(JSON, default=list)
    links_json = Column(JSON, default=list)
    visible_sections_json = Column(JSON, default=list)
    section_order_json = Column(JSON, default=list)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="resumes")
    versions = relationship("ResumeVersion", back_populates="resume", cascade="all, delete-orphan")


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    resume_id = Column(GUID, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    change_summary = Column(String(255), nullable=True)
    snapshot_payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    resume = relationship("Resume", back_populates="versions")


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=False, default="Present")
    description = Column(Text, nullable=True)
    bullets = Column(JSON, default=list)
    is_current = Column(Boolean, default=False)
    origin = Column(String(50), default="USER")  # 'USER' | 'AI_PROPOSED'
    status = Column(String(50), default="user_confirmed")  # 'ai_suggested' | 'user_confirmed' | 'user_rejected'
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="work_experiences")


class Education(Base):
    __tablename__ = "educations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=False)
    field_of_study = Column(String(255), nullable=True)
    start_year = Column(String(20), nullable=True)
    end_year = Column(String(20), nullable=True)
    grade_or_gpa = Column(String(50), nullable=True)
    origin = Column(String(50), default="USER")  # 'USER' | 'AI_PROPOSED'
    status = Column(String(50), default="user_confirmed")  # 'ai_suggested' | 'user_confirmed' | 'user_rejected'
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="educations")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    issuer = Column(String(255), nullable=False)
    issue_date = Column(String(50), nullable=True)
    credential_url = Column(String(500), nullable=True)
    origin = Column(String(50), default="USER")  # 'USER' | 'AI_PROPOSED'
    status = Column(String(50), default="user_confirmed")  # 'ai_suggested' | 'user_confirmed' | 'user_rejected'
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="certifications")


class SocialLink(Base):
    __tablename__ = "social_links"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(100), nullable=False)  # 'linkedin', 'github', 'portfolio', 'twitter', 'phone'
    url = Column(String(500), nullable=False)
    label = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="social_links")
