import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# App configs
APP_ENV = os.getenv("APP_ENV", "development")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_jwt_signing_key_change_me_in_prod")

if APP_ENV == "production" and JWT_SECRET == "super_secret_jwt_signing_key_change_me_in_prod":
    raise ValueError("JWT_SECRET must be changed in production!")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Database config
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./career_graph.db")

# GitHub OAuth configs
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:3000/auth/callback")

# LLM API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
