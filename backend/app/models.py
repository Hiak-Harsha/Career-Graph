import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Float, Integer, Date, Table, JSON, Enum
)
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

Base = declarative_base()

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
    education = Column(Text)
    career_goal = Column(Text)
    github_username = Column(String(255), unique=True)
    github_access_token = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="user", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="user", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="user", cascade="all, delete-orphan")
    domain_progress = relationship("DomainProgress", back_populates="user", cascade="all, delete-orphan")
    skill_progress = relationship("SkillProgress", back_populates="user", cascade="all, delete-orphan")
    snapshots = relationship("CareerSnapshot", back_populates="user", cascade="all, delete-orphan")


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
    sync_hash = Column(String(255), nullable=True)  # Store MD5 hash of (README + files + languages)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="projects")
    ideas = relationship("Idea", back_populates="parent_project")
    skills = relationship("Skill", secondary=project_skills, back_populates="projects")
    domains = relationship("Domain", secondary=project_domains, back_populates="projects")
    claims = relationship("Claim", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="project")
    ai_inferences = relationship("AIInference", back_populates="project")


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="EXPLORING")  # EXPLORING, PROTOTYPE, MATURING, ABANDONED
    maturity = Column(String(50), default="EARLY")  # EARLY, MID, MATURE
    parent_project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="ideas")
    parent_project = relationship("Project", back_populates="ideas")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    category = Column(String(100))  # LANGUAGE, LIBRARY, FRAMEWORK, DATABASE, CONCEPT, TOOL, CLOUD
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    projects = relationship("Project", secondary=project_skills, back_populates="skills")
    skill_progress = relationship("SkillProgress", back_populates="skill", cascade="all, delete-orphan")
    role_requirements = relationship("RoleRequirement", back_populates="skill", cascade="all, delete-orphan")


class Domain(Base):
    __tablename__ = "domains"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    parent_domain_id = Column(GUID, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text)
    created_by = Column(String(50), default="SYSTEM")  # SYSTEM, USER, AI_DISCOVERED
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    parent = relationship("Domain", remote_side=[id], backref="subdomains")
    projects = relationship("Project", secondary=project_domains, back_populates="domains")
    domain_progress = relationship("DomainProgress", back_populates="domain", cascade="all, delete-orphan")
    role_requirements = relationship("RoleRequirement", back_populates="domain", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # GITHUB_COMMIT, GITHUB_PR, GITHUB_RELEASE, README, DOCUMENT, etc.
    source = Column(String(255), nullable=False)  # 'github', 'devpost', 'medium', 'user_input'
    source_url = Column(String(500))
    source_identifier = Column(String(255))  # commit hash, PR number, etc.
    content = Column(Text)
    captured_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="evidence")
    claims = relationship("Claim", secondary=claim_evidence, back_populates="evidence")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    claim = Column(Text, nullable=False)
    claim_type = Column(String(100))  # TECHNICAL_ACHIEVEMENT, DOMAIN_EXPERTISE, ARCHITECTURE, OPTIMIZATION
    confidence = Column(Float, default=1.0)
    origin = Column(String(50), default="AI_PROPOSED")  # DETERMINISTIC, AI_PROPOSED
    status = Column(String(50), default="ai_suggested")  # ai_suggested, user_confirmed, user_rejected
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="claims")
    project = relationship("Project", back_populates="claims")
    evidence = relationship("Evidence", secondary=claim_evidence, back_populates="claims")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)  # COMMIT, PR_CREATED, PR_MERGED, RELEASE, POST_CREATED, IDEA_CREATED
    source = Column(String(255), nullable=False)  # 'github', 'medium', etc.
    source_id = Column(String(255))
    timestamp = Column(DateTime(timezone=True), nullable=False)
    activity_metadata = Column("metadata", JSON)  # stores arbitrary JSON data
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="activities")


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
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

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
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="skill_progress")
    skill = relationship("Skill", back_populates="skill_progress")


class CareerSnapshot(Base):
    __tablename__ = "career_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    snapshot_date = Column(Date, default=datetime.utcnow().date)
    dominant_domains = Column(JSON)  # stores list of dominant domains
    emerging_domains = Column(JSON)  # stores list of emerging domains
    strongest_skills = Column(JSON)  # stores list of strongest skills
    active_projects = Column(JSON)  # stores list of active projects
    career_direction = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="snapshots")


class Role(Base):
    __tablename__ = "roles"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

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
    input_payload = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="ai_inferences")
