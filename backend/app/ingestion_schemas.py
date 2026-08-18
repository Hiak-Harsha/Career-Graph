from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExtractedWorkExperience(BaseModel):
    company: str = Field(description="Company or organization name")
    role: str = Field(description="Job title or role")
    location: Optional[str] = Field(default=None, description="Location (e.g. City, State, Remote)")
    start_date: str = Field(description="Start date (e.g. 2021, Jan 2021)")
    end_date: str = Field(default="Present", description="End date (e.g. 2023, Dec 2023, or Present)")
    bullets: List[str] = Field(default_factory=list, description="List of accomplishment bullets or responsibilities")


class ExtractedEducation(BaseModel):
    institution: str = Field(description="University, college or institution name")
    degree: str = Field(description="Degree or credential (e.g. B.S., M.S., B.Tech)")
    field_of_study: Optional[str] = Field(default=None, description="Major or field of study")
    start_year: Optional[str] = Field(default=None, description="Start year")
    end_year: Optional[str] = Field(default=None, description="Graduation/End year")


class ExtractedCertification(BaseModel):
    name: str = Field(description="Certification or credential name")
    issuer: Optional[str] = Field(default=None, description="Issuing authority or organization (e.g. AWS, Coursera, Google)")
    issue_date: Optional[str] = Field(default=None, description="Issue date or year")


class ExtractedProfile(BaseModel):
    headline: Optional[str] = Field(default=None, description="Professional headline or title line")
    work_experiences: List[ExtractedWorkExperience] = Field(default_factory=list)
    educations: List[ExtractedEducation] = Field(default_factory=list)
    certifications: List[ExtractedCertification] = Field(default_factory=list)
    social_links: List[Dict[str, str]] = Field(default_factory=list, description="List of dicts with 'platform' and 'url'")


class ProfileIngestRequest(BaseModel):
    source_type: str = "paste"  # "paste", "file", "github_readme"
    raw_text: Optional[str] = None
    file_content_base64: Optional[str] = None
    file_name: Optional[str] = None
    github_readme: Optional[bool] = False
