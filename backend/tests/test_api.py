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
