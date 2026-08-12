import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.models import Base, Role

# Default to local SQLite database if no database URL is provided
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./career_graph.db")

# Use check_same_thread=False only for SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Create all tables in database if they do not exist
    Base.metadata.create_all(bind=engine)
    
    # Pre-populate default roles
    db = SessionLocal()
    try:
        default_roles = [
            ("Software Engineer", "General software development, frontend, backend, system design, and software craftsmanship."),
            ("Machine Learning Engineer", "Building, evaluating, and deploying machine learning models, pipelines, and data engineering systems."),
            ("Data Scientist", "Data analysis, statistics, exploratory data analysis, visualizations, and modeling."),
            ("Research Engineer", "Experimental engineering, novel algorithmic development, academic/research implementations, and scientific programming."),
            ("Backend Engineer", "Building secure, scalable API services, database design, caching, system design, and infrastructure automation.")
        ]
        for name, desc in default_roles:
            exists = db.query(Role).filter(Role.name == name).first()
            if not exists:
                role = Role(name=name, description=desc)
                db.add(role)
        db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
