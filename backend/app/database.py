import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.config import DATABASE_URL
from backend.app.models import Base, Role

# Use check_same_thread=False only for SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    try:
        engine = create_engine(DATABASE_URL)
        # Eagerly test the connection to verify PostgreSQL is active
        with engine.connect() as conn:
            pass
    except Exception as e:
        print(f"Warning: Remote database connection failed ({e}). Falling back to local SQLite database.")
        DATABASE_URL = "sqlite:///./career_graph.db"
        engine = create_engine(
            DATABASE_URL, connect_args={"check_same_thread": False}
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _migrate_sqlite_columns():
    """Ensure newly added columns exist in existing SQLite tables without dropping data."""
    try:
        with engine.connect() as conn:
            # Check ideas table columns
            cursor = conn.execute(text("PRAGMA table_info(ideas)"))
            existing_idea_cols = {row[1] for row in cursor.fetchall()}
            
            if existing_idea_cols:
                if "maturity" not in existing_idea_cols:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN maturity VARCHAR(50) DEFAULT 'EARLY'"))
                if "parent_project_id" not in existing_idea_cols:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN parent_project_id VARCHAR(36)"))
                if "skills_json" not in existing_idea_cols:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN skills_json TEXT"))
                if "domains_json" not in existing_idea_cols:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN domains_json TEXT"))
                if "notes_json" not in existing_idea_cols:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN notes_json TEXT"))
                conn.commit()
    except Exception as e:
        print(f"Notice: SQLite column migration check: {e}")

def init_db():
    # Create all tables in database if they do not exist
    Base.metadata.create_all(bind=engine)
    
    # Run column migrations for SQLite
    _migrate_sqlite_columns()
    
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
