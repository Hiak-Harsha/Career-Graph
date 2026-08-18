from pydantic import BaseModel, EmailStr, HttpUrl, ConfigDict
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from uuid import UUID

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None
    is_public: Optional[bool] = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    career_goal: Optional[str] = None
    github_username: Optional[str] = None
    github_access_token: Optional[str] = None
    is_public: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID
    is_public: bool = True
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Structured Career History Schemas
class WorkExperienceCreate(BaseModel):
    company: str
    role: str
    location: Optional[str] = None
    start_date: str
    end_date: str = "Present"
    description: Optional[str] = None
    bullets: List[str] = []
    is_current: bool = False
    origin: Optional[str] = "USER"
    status: Optional[str] = "user_confirmed"

class WorkExperienceResponse(WorkExperienceCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EducationCreate(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    grade_or_gpa: Optional[str] = None
    origin: Optional[str] = "USER"
    status: Optional[str] = "user_confirmed"

class EducationResponse(EducationCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CertificationCreate(BaseModel):
    name: str
    issuer: str
    issue_date: Optional[str] = None
    credential_url: Optional[str] = None
    origin: Optional[str] = "USER"
    status: Optional[str] = "user_confirmed"

class CertificationResponse(CertificationCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    label: Optional[str] = None

class SocialLinkResponse(SocialLinkCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProfileDetailsResponse(BaseModel):
    profile: UserResponse
    work_experiences: List[WorkExperienceResponse]
    educations: List[EducationResponse]
    certifications: List[CertificationResponse]
    social_links: List[SocialLinkResponse]
    model_config = ConfigDict(from_attributes=True)

# Skill Schemas
class SkillResponse(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Domain Schemas
class DomainResponse(BaseModel):
    id: UUID
    name: str
    parent_domain_id: Optional[UUID] = None
    description: Optional[str] = None
    created_by: str
    model_config = ConfigDict(from_attributes=True)

# Project Schemas
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str
    project_type: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    repository_url: Optional[str] = None
    demo_url: Optional[str] = None
    complexity_score: float = 0.0
    individual_or_team: str = "INDIVIDUAL"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    skills: List[SkillResponse] = []
    domains: List[DomainResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Idea Schemas
class IdeaBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "EXPLORING"
    maturity: str = "EARLY"
    potential_impact: str = "MEDIUM"
    parent_project_id: Optional[UUID] = None
    skills_json: List[str] = []
    domains_json: List[str] = []
    notes_json: List[Dict[str, Any]] = []

class IdeaCreate(IdeaBase):
    pass

class IdeaNoteCreate(BaseModel):
    note: str

class IdeaResponse(IdeaBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class IdeaAutoDraftResponse(BaseModel):
    drafts: List[IdeaBase]


# Evidence Schemas
class EvidenceResponse(BaseModel):
    id: UUID
    type: str
    source: str
    source_url: Optional[str] = None
    source_identifier: Optional[str] = None
    content: Optional[str] = None
    captured_at: datetime
    confidence: float
    model_config = ConfigDict(from_attributes=True)

# Claim Schemas
class ClaimResponse(BaseModel):
    id: UUID
    claim: str
    claim_type: Optional[str] = None
    confidence: float
    status: str
    project_id: Optional[UUID] = None
    evidence: List[EvidenceResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Progress Schemas
class DomainProgressResponse(BaseModel):
    domain: DomainResponse
    exposure_score: float
    activity_score: float
    evidence_score: float
    depth_score: float
    recency_score: float
    current_level: str
    trajectory: str
    first_detected: Optional[datetime] = None
    last_active: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SkillProgressResponse(BaseModel):
    skill: SkillResponse
    evidence_count: int
    usage_frequency: float
    depth_score: float
    recency_score: float
    confidence: float
    trajectory: str
    current_level: str
    first_seen: Optional[datetime] = None
    last_used: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Portfolio response wrapper
class PortfolioResponse(BaseModel):
    profile: UserResponse
    projects: List[ProjectResponse]
    ideas: List[IdeaResponse]
    domain_progress: List[DomainProgressResponse]
    skills: List[SkillProgressResponse]
    problem_solving_profile: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    work_experiences: List[WorkExperienceResponse] = []
    educations: List[EducationResponse] = []
    certifications: List[CertificationResponse] = []
    social_links: List[SocialLinkResponse] = []

# Persisted Resume Schemas
class ResumeItem(BaseModel):
    id: Optional[Union[UUID, str]] = None
    title: str
    description: Optional[str] = ""
    skills: Optional[List[Any]] = []
    evidence_links: Optional[List[Any]] = []
    narrative: Optional[str] = ""
    selected_reasons: Optional[List[str]] = []
    included: Optional[bool] = True
    custom_bullets: Optional[List[str]] = []
    claims: Optional[List[Any]] = []
    technologies: Optional[List[str]] = []
    summary: Optional[str] = ""

class ResumeResponse(BaseModel):
    id: Optional[UUID] = None
    target_role: str
    profile: Optional[UserResponse] = None
    summary: str
    projects: List[Any]
    skills: List[Any]
    claims: List[Any]
    variant: Optional[str] = "visual"
    resume_format: Optional[str] = "ats_clean"
    title: Optional[str] = "Master Resume"
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[Dict[str, Any]]] = []
    links: Optional[List[Dict[str, Any]]] = []
    visible_sections: Optional[List[str]] = None
    section_order: Optional[List[str]] = None
    is_primary: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ResumeSaveRequest(BaseModel):
    title: Optional[str] = "Master Resume"
    target_role: Optional[str] = "Software Engineer"
    variant: Optional[str] = "visual"
    resume_format: Optional[str] = "ats_clean"
    summary: Optional[str] = ""
    skills: Optional[List[Any]] = []
    claims: Optional[List[Any]] = []
    projects: Optional[List[Any]] = []
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[Dict[str, Any]]] = []
    links: Optional[List[Dict[str, Any]]] = []
    visible_sections: Optional[List[str]] = None
    section_order: Optional[List[str]] = None
    is_primary: Optional[bool] = False

class AIImproveRequest(BaseModel):
    field_type: str  # 'summary' or 'bullet'
    text: str
    target_role: Optional[str] = "Software Engineer"
    context: Optional[str] = None

class AIImproveResponse(BaseModel):
    improved_text: str
    suggestions: Optional[List[str]] = []

# Recruiter Role Match Schemas
class RoleFitBreakdown(BaseModel):
    required_capability_coverage: float  # 0.0 - 100.0%
    direct_evidence_coverage: float  # 0.0 - 100.0%
    recent_relevance: float  # 0.0 - 100.0%
    demonstrated_depth: float  # 0.0 - 100.0%
    overall_fit: str  # 'Strong Evidence', 'Moderate Evidence', 'Developing', 'Insufficient Evidence'
    fit_score: int  # 0 - 100
    is_sufficient_evidence: bool = True

class CriteriaMatch(BaseModel):
    item_name: str
    type: str  # 'skill' or 'domain'
    status: str  # 'strong', 'moderate', 'weak', 'no_evidence'
    details: str
    evidence_count: int = 0
    freshness: Optional[str] = "ACTIVE"  # 'ACTIVE', 'HISTORICAL', 'DORMANT'

class RecruiterMatchResponse(BaseModel):
    role_name: str
    overall_match: str  # 'Strong Evidence', 'Moderate Evidence', 'Developing', 'Insufficient Evidence'
    why_text: str
    strengths: List[str]
    gaps: List[str]
    criteria_matches: List[CriteriaMatch]
    evidence_backed_claims: List[ClaimResponse]
    role_fit: Optional[RoleFitBreakdown] = None
    proven_capabilities: List[str] = []
    no_evidence_capabilities: List[str] = []

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID

class GitHubAuthCode(BaseModel):
    code: str

# ─── Resume Intelligence Engine Schemas ────────────────────────────────────────

class DomainSignatureNode(BaseModel):
    id: str
    name: str
    category: str
    level: str
    evidence_count: int

class DomainSignatureEdge(BaseModel):
    source: str
    target: str
    relationship: str

class ProfessionalIdentityResponse(BaseModel):
    user_id: UUID
    candidate_name: str
    headline: str
    primary_domains: List[str]
    emerging_domains: List[str]
    strong_capabilities: List[str]
    current_trajectory: str
    evidence_strength: str  # 'High', 'Moderate', 'Developing', 'Insufficient Evidence'
    research_orientation: str  # 'Increasing', 'Stable', 'Experimental', 'Unobserved'
    project_style: str
    signature_nodes: List[DomainSignatureNode]
    signature_edges: List[DomainSignatureEdge]
    total_verified_claims: int
    total_repositories: int
    is_sufficient_evidence: bool = True
    evidence_coverage: float = 1.0

class ResumeStrategyRequest(BaseModel):
    target_role: str
    custom_role_description: Optional[str] = None
    layout_preference: Optional[str] = "modern_professional"
    resume_format: Optional[str] = "ats_clean"

class ResumeStrategyResponse(BaseModel):
    target_role: str
    candidate_positioning: str
    primary_domains: List[str]
    supporting_domains: List[str]
    projects_to_highlight: List[str]
    skills_to_emphasize: List[str]
    evidence_priorities: List[str]
    weak_areas: List[str]
    unsupported_capabilities: List[str] = []
    suggested_layout: str  # 'editorial', 'technical', 'modern_professional', 'research', 'executive'
    role_alignment_score: float  # 0.0 - 1.0
    role_fit: Optional[RoleFitBreakdown] = None
    is_sufficient_evidence: bool = True

class PositioningBlockPayload(BaseModel):
    statement: str
    evidence_strength: Optional[str] = "High"
    summary_bullets: Optional[List[str]] = []

class AchievementItem(BaseModel):
    icon: str  # lucide icon key, assigned deterministically
    title: str  # short claim headline, derived from Claim.claim
    description: str  # the verified claim text itself
    claim_id: Optional[str] = None  # lets the frontend wire proof inspection

class AchievementsBlockPayload(BaseModel):
    achievements: List[AchievementItem]

class ResumeBlockItem(BaseModel):
    block_type: str  # 'identity', 'signature', 'positioning', 'selected_work', 'technical_depth', 'trajectory', 'experience', 'education', 'certifications', 'achievements'
    title: str
    subtitle: Optional[str] = None
    order: int
    content_payload: Dict[str, Any]

class ResumeBlockRepresentation(BaseModel):
    target_role: str
    layout_personality: str  # 'editorial', 'technical', 'modern_professional', 'research', 'executive', 'featured'
    resume_format: Optional[str] = "ats_clean"  # 'ats_clean' | 'visual'
    positioning_statement: str
    blocks: List[ResumeBlockItem]
    evidence_coverage_rate: float
    verification_rate: float
    generated_at: datetime

class ResumeValidationRequest(BaseModel):
    target_role: str
    blocks: List[ResumeBlockItem]

class ResumeValidationResponse(BaseModel):
    is_valid: bool
    unverified_claims: List[str]
    fabricated_metrics_detected: List[str]
    sanitized_blocks: List[ResumeBlockItem]
    verified_claim_count: int
    total_claims_checked: int

class ReadinessDimension(BaseModel):
    dimension: str
    rating: str  # 'Strong', 'Moderate', 'Developing'
    score: int  # 0 - 100
    insight: str

class ResumeCritiqueRequest(BaseModel):
    target_role: str
    blocks: Optional[List[ResumeBlockItem]] = None

class ResumeCritiqueResponse(BaseModel):
    target_role: str
    readiness_dimensions: List[ReadinessDimension]
    overall_readiness: str  # 'Strong', 'Moderate', 'Developing'
    recruiter_attention_hierarchy: Dict[str, str]  # '0_to_3s', '3_to_8s', '8_to_18s', '18_to_30s'
    fails_to_communicate_gaps: List[str]
    recommended_improvements: List[str]

class ImproveRepresentationRequest(BaseModel):
    target_role: str
    selected_gaps_to_fix: List[str]
    layout_personality: Optional[str] = "modern_professional"

class CustomJobDescriptionMatchRequest(BaseModel):
    title: Optional[str] = "Custom Target Role"
    job_description_text: str


