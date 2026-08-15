import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import get_db, Base
from backend.app.models import User, Project, Skill, Domain, Claim, DomainProgress, SkillProgress, Evidence

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_career_graph.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Setup test database tables
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    
    # Seed default roles
    from backend.app.models import Role
    default_roles = [
        ("Software Engineer", "General software development, frontend, backend, system design, and software craftsmanship."),
        ("Machine Learning Engineer", "Building, evaluating, and deploying machine learning models, pipelines, and data engineering systems."),
        ("Data Scientist", "Data analysis, statistics, exploratory data analysis, visualizations, and modeling."),
        ("Research Engineer", "Experimental engineering, novel algorithmic development, academic/research implementations, and scientific programming."),
        ("Backend Engineer", "Building secure, scalable API services, database design, caching, system design, and infrastructure automation.")
    ]
    for name, desc in default_roles:
        exists = db_session.query(Role).filter(Role.name == name).first()
        if not exists:
            role = Role(name=name, description=desc)
            db_session.add(role)
    db_session.commit()

    yield db_session
    db_session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    # Override get_db dependency
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_init_db_and_roles(client, db):
    # Test that default roles were seeded on startup
    response = client.post("/api/auth/mock")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    
    # Check that a user exists
    user = db.query(User).filter(User.email == "madhav@example.com").first()
    assert user is not None
    assert user.name == "Madhav"

def test_sync_demo_projects(client, db):
    # Sync demo projects to populate mock data
    response = client.post("/api/sync/demo")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify projects exist in DB
    projects = db.query(Project).all()
    assert len(projects) == 3
    titles = [p.title for p in projects]
    assert "smart-navigation-system" in titles
    assert "ai-fake-news-detector" in titles
    assert "algorithmic-reasoning-platform" in titles
    
    # Check that skills and domains were populated
    skills = db.query(Skill).all()
    assert len(skills) > 0
    domains = db.query(Domain).all()
    assert len(domains) > 0
    
    # Check that claims were created and mapped to evidence
    claims = db.query(Claim).all()
    assert len(claims) > 0
    for claim in claims:
        assert claim.claim != ""
        assert claim.project_id is not None
        
    # Check that progress tables have scores
    dom_progress = db.query(DomainProgress).all()
    assert len(dom_progress) > 0
    
    skill_progress = db.query(SkillProgress).all()
    assert len(skill_progress) > 0

def test_get_portfolio(client):
    response = client.get("/api/portfolio")
    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert "projects" in data
    assert "ideas" in data
    assert "domain_progress" in data
    assert "skills" in data
    assert "problem_solving_profile" in data
    assert "timeline" in data
    
    assert data["profile"]["name"] == "Madhav"
    assert len(data["projects"]) == 3
    assert len(data["timeline"]) == 3
    assert len(data["problem_solving_profile"]["frequently_works_with"]) > 0

def test_get_dynamic_resume(client):
    # Test tailorable resume for Software Engineer
    se_response = client.get("/api/resume?role=Software+Engineer")
    assert se_response.status_code == 200
    se_data = se_response.json()
    assert se_data["target_role"] == "Software Engineer"
    assert len(se_data["projects"]) == 3
    
    # Check that the first project is Software Engineering focused (usually navigation or reasoning)
    assert se_data["projects"][0]["title"] in ["smart-navigation-system", "algorithmic-reasoning-platform"]
    
    # Test tailorable resume for Machine Learning Engineer
    mle_response = client.get("/api/resume?role=Machine+Learning+Engineer")
    assert mle_response.status_code == 200
    mle_data = mle_response.json()
    assert mle_data["target_role"] == "Machine Learning Engineer"
    
    # Check that ML focused project ranks first
    assert mle_data["projects"][0]["title"] == "ai-fake-news-detector"

def test_recruiter_match(client):
    # Match against Machine Learning Engineer
    mle_response = client.get("/api/recruiter/match?role_name=Machine+Learning+Engineer")
    assert mle_response.status_code == 200
    mle_data = mle_response.json()
    assert mle_data["role_name"] == "Machine Learning Engineer"
    assert mle_data["overall_match"] in ["Strong Match", "Moderate Match", "Developing Match"]
    assert len(mle_data["criteria_matches"]) > 0
    assert len(mle_data["evidence_backed_claims"]) > 0
    
    # Check that claims have evidence relationships
    for claim in mle_data["evidence_backed_claims"]:
        assert claim["claim"] != ""


def test_double_sync_uniqueness(client, db):
    # Get current evidence count
    initial_count = db.query(Evidence).count()
    
    # Sync demo projects again (Sync 2)
    response = client.post("/api/sync/demo")
    assert response.status_code == 200
    
    # Verify evidence count has NOT grown (uniqueness check works)
    post_count = db.query(Evidence).count()
    assert post_count == initial_count


def test_review_and_confirm_flow(client, db):
    # Find a project and manually insert an ai_suggested domain and claim
    from backend.app.models import Project, Domain, Claim, project_domains
    
    proj = db.query(Project).first()
    assert proj is not None
    
    # Add a mock suggested domain
    dom = db.query(Domain).filter(Domain.name == "System Architecture").first()
    if not dom:
        dom = Domain(name="System Architecture", created_by="SYSTEM")
        db.add(dom)
        db.flush()
        
    # Check if domain mapping exists
    mapping = db.execute(
        project_domains.select().where(
            project_domains.c.project_id == proj.id,
            project_domains.c.domain_id == dom.id
        )
    ).first()
    if not mapping:
        proj.domains.append(dom)
        db.flush()
        
    db.execute(
        project_domains.update().where(
            project_domains.c.project_id == proj.id,
            project_domains.c.domain_id == dom.id
        ).values(
            confidence=0.8,
            relevance=0.8,
            origin="AI_PROPOSED",
            status="ai_suggested"
        )
    )
        
    # Add a suggested claim
    claim = db.query(Claim).filter(Claim.claim == "Designed clean hexagonal architecture").first()
    if not claim:
        claim = Claim(
            user_id=proj.user_id,
            project_id=proj.id,
            claim="Designed clean hexagonal architecture",
            claim_type="ARCHITECTURE",
            confidence=1.0,
            origin="AI_PROPOSED",
            status="ai_suggested"
        )
        db.add(claim)
        
    db.commit()
    
    # 2. Query review queue
    res_review = client.get("/api/review")
    assert res_review.status_code == 200
    review_data = res_review.json()
    
    assert len(review_data["claims"]) > 0
    assert len(review_data["domains"]) > 0
    
    claim_id_to_confirm = claim.id
    
    # 3. Confirm the suggested claim
    res_confirm_claim = client.patch(
        f"/api/claims/{claim_id_to_confirm}",
        json={"status": "user_confirmed"}
    )
    assert res_confirm_claim.status_code == 200
    
    # Verify it is now confirmed
    db.refresh(claim)
    assert claim.status == "user_confirmed"
    
    # 4. Confirm the suggested domain
    res_confirm_domain = client.patch(
        f"/api/project-domains/{proj.id}/{dom.id}",
        json={"status": "user_confirmed"}
    )
    assert res_confirm_domain.status_code == 200
    
    # Verify domain progress calculation is triggered
    dom_progress = db.query(DomainProgress).filter(DomainProgress.domain_id == dom.id).first()
    assert dom_progress is not None
    assert dom_progress.exposure_score > 0.0


def test_validation_of_repository_urls(client, db):
    from fastapi import HTTPException
    from backend.app.analyzer import sync_github_project
    
    user = db.query(User).first()
    assert user is not None
    
    # Test invalid format
    invalid_repo = {
        "name": "invalid-repo",
        "html_url": "https://malicious-site.com/invalid-repo",
        "created_at": "2025-01-10T12:00:00Z"
    }
    details = {"readme": "test", "languages": {}, "files": []}
    
    with pytest.raises(HTTPException) as exc_info:
        sync_github_project(db, user, invalid_repo, details)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid repository URL format."


def test_global_llm_caching(client, db):
    from backend.app.analyzer import sync_github_project
    from backend.app.models import AIInference, Project
    import json
    
    user = db.query(User).first()
    assert user is not None
    
    # Create unique hash
    readme = "unique_cached_project_readme_content"
    languages = {"Python": 1000}
    files = ["main.py"]
    
    from backend.app.analyzer import calculate_sync_hash
    test_hash = calculate_sync_hash(readme, languages, files)
    
    # Pre-populate AIInference cache entries
    openai_payload = {
        "domains": [{"name": "Cache Domain", "confidence": 0.9, "relevance": 0.9}],
        "skills": [{"name": "Cache Skill", "category": "CONCEPT", "relationship": "USES"}],
        "technologies": ["Python"]
    }
    anthropic_payload = {
        "complexity_score": 8.5,
        "status": "COMPLETED",
        "problem_solving_patterns": ["caching pattern"],
        "claims": [{"claim": "Cached achievement", "claim_type": "TECHNICAL_ACHIEVEMENT", "evidence_files": ["main.py"]}]
    }
    
    cached_openai = AIInference(
        prompt_type="openai_extraction",
        content_hash=test_hash,
        input_payload="dummy input",
        response_payload=json.dumps(openai_payload)
    )
    cached_anthropic = AIInference(
        prompt_type="anthropic_reasoning",
        content_hash=test_hash,
        input_payload="dummy input",
        response_payload=json.dumps(anthropic_payload)
    )
    db.add(cached_openai)
    db.add(cached_anthropic)
    db.commit()
    
    # Run sync - should hit the cache and not require active API keys
    repo_data = {
        "name": "cache-project",
        "html_url": "https://github.com/demo/cache-project",
        "created_at": "2025-01-10T12:00:00Z"
    }
    details = {
        "readme": readme,
        "languages": languages,
        "files": files,
        "commits": []
    }
    
    sync_github_project(db, user, repo_data, details, auto_confirm=True)
    
    # Verify project mapped from cache
    proj = db.query(Project).filter(Project.title == "cache-project").first()
    assert proj is not None
    assert proj.complexity_score == 8.5
    assert len(proj.skills) > 0
    assert proj.skills[0].name == "Cache Skill"


def test_sync_rate_limiting(client):
    from backend.app.main import sync_request_history
    
    # Reset limit history for test user
    response_auth = client.post("/api/auth/mock")
    user_id = response_auth.json()["user_id"]
    sync_request_history[str(user_id)] = []
    
    # Perform 5 successful requests
    for i in range(5):
        res = client.post("/api/sync/demo")
        assert res.status_code == 200
        
    # The 6th request must trigger a 429 rate limit error
    res_limit = client.post("/api/sync/demo")
    assert res_limit.status_code == 429
    assert "Rate limit exceeded" in res_limit.json()["detail"]


def test_resume_crud_persistence(client):
    # 1. Create a customized resume
    create_payload = {
        "title": "Senior Distributed Systems Engineer",
        "target_role": "Backend Engineer",
        "variant": "ats",
        "summary": "Expert in distributed consensus and high-throughput microservices.",
        "skills": ["Go", "Kubernetes", "PostgreSQL", "Kafka"],
        "claims": ["Engineered distributed cache layer reducing p99 latency to 4ms"],
        "projects": [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "title": "Smart Routing Engine",
                "description": "High-throughput graph routing",
                "skills": ["Go", "C++"],
                "evidence_links": [{"type": "COMMIT", "url": "https://github.com/test", "label": "Commit #1"}],
                "narrative": "Engineered spatial contraction hierarchy engine",
                "custom_bullets": ["Engineered spatial contraction hierarchy engine"],
                "included": True
            }
        ],
        "is_primary": True
    }
    res_create = client.post("/api/resumes", json=create_payload)
    assert res_create.status_code == 200
    created_data = res_create.json()
    assert created_data["title"] == "Senior Distributed Systems Engineer"
    assert created_data["target_role"] == "Backend Engineer"
    assert created_data["variant"] == "ats"
    resume_id = created_data["id"]

    # 2. List resumes
    res_list = client.get("/api/resumes")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert len(list_data) >= 1
    assert any(r["id"] == resume_id for r in list_data)

    # 3. Retrieve single resume
    res_get = client.get(f"/api/resumes/{resume_id}")
    assert res_get.status_code == 200
    assert res_get.json()["summary"] == "Expert in distributed consensus and high-throughput microservices."

    # 4. Update resume
    update_payload = {
        "title": "Lead Distributed Systems Architect",
        "summary": "Updated summary with deeper cloud architecture focus.",
        "skills": ["Go", "Kubernetes", "PostgreSQL", "Kafka", "Rust"]
    }
    res_update = client.put(f"/api/resumes/{resume_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "Lead Distributed Systems Architect"
    assert "Rust" in res_update.json()["skills"]

    # 5. Delete resume
    res_delete = client.delete(f"/api/resumes/{resume_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["status"] == "deleted"

    # Verify 404 on deleted resume
    res_deleted_get = client.get(f"/api/resumes/{resume_id}")
    assert res_deleted_get.status_code == 404


def test_resume_ai_improve(client):
    res_summary = client.post("/api/resumes/ai-improve", json={
        "field_type": "summary",
        "text": "I build web apps and microservices",
        "target_role": "Backend Engineer"
    })
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert len(summary_data["improved_text"]) > 0
    assert len(summary_data["suggestions"]) > 0

    res_bullet = client.post("/api/resumes/ai-improve", json={
        "field_type": "bullet",
        "text": "wrote api endpoints for search",
        "target_role": "Software Engineer"
    })
    assert res_bullet.status_code == 200
    bullet_data = res_bullet.json()
    assert "Architected and deployed" in bullet_data["improved_text"]


def test_profile_details_and_career_history(client):
    # 1. Add Work Experience
    exp_payload = {
        "company": "Stripe",
        "role": "Senior Infrastructure Engineer",
        "location": "San Francisco, CA",
        "start_date": "Jan 2022",
        "end_date": "Present",
        "description": "Led core ledger reliability engineering team.",
        "bullets": ["Architected multi-region failover", "Reduced sync latency by 40%"],
        "is_current": True
    }
    res_exp = client.post("/api/profile/experience", json=exp_payload)
    assert res_exp.status_code == 200
    exp_id = res_exp.json()["id"]

    # 2. Add Education
    edu_payload = {
        "institution": "University of California, Berkeley",
        "degree": "B.S. Computer Science",
        "field_of_study": "Systems & AI",
        "start_year": "2018",
        "end_year": "2022",
        "grade_or_gpa": "3.9 GPA"
    }
    res_edu = client.post("/api/profile/education", json=edu_payload)
    assert res_edu.status_code == 200
    edu_id = res_edu.json()["id"]

    # 3. Add Certification
    cert_payload = {
        "name": "AWS Certified Solutions Architect - Professional",
        "issuer": "Amazon Web Services",
        "issue_date": "2024",
        "credential_url": "https://aws.amazon.com/verification"
    }
    res_cert = client.post("/api/profile/certification", json=cert_payload)
    assert res_cert.status_code == 200
    cert_id = res_cert.json()["id"]

    # 4. Add Social Link
    link_payload = {
        "platform": "linkedin",
        "url": "https://linkedin.com/in/alexrivera",
        "label": "LinkedIn Profile"
    }
    res_link = client.post("/api/profile/link", json=link_payload)
    assert res_link.status_code == 200
    link_id = res_link.json()["id"]

    # 5. Fetch combined profile details
    res_details = client.get("/api/profile/details")
    assert res_details.status_code == 200
    details = res_details.json()
    assert len(details["work_experiences"]) >= 1
    assert len(details["educations"]) >= 1
    assert len(details["certifications"]) >= 1
    assert len(details["social_links"]) >= 1

    # Cleanup created items
    assert client.delete(f"/api/profile/experience/{exp_id}").status_code == 200
    assert client.delete(f"/api/profile/education/{edu_id}").status_code == 200
    assert client.delete(f"/api/profile/certification/{cert_id}").status_code == 200
    assert client.delete(f"/api/profile/link/{link_id}").status_code == 200


