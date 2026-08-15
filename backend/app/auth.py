from datetime import datetime, timedelta, timezone
import httpx
from typing import Optional
import jwt
import base64
import hashlib
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.config import (
    JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI,
    ALLOW_ANONYMOUS_DEV_LOGIN, APP_ENV
)
from backend.app.database import get_db
from backend.app.models import User

# Derive a 32-byte Fernet key from JWT_SECRET
key_bytes = hashlib.sha256(JWT_SECRET.encode()).digest()
fernet_key = base64.urlsafe_b64encode(key_bytes)
fernet = Fernet(fernet_key)

def encrypt_token(token: str) -> str:
    if not token:
        return token
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(token: str) -> str:
    if not token:
        return token
    try:
        return fernet.decrypt(token.encode()).decode()
    except Exception:
        # Fallback if decryption fails (e.g., token was stored as plaintext before)
        return token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        if not ALLOW_ANONYMOUS_DEV_LOGIN or APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token missing. Please log in.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Development fallback when explicitly allowed
        user = db.query(User).first()
        if user:
            return user
        # If no users exist, create a mock user
        mock_user = User(
            name="Madhav",
            email="madhav@example.com",
            headline="Full Stack Engineer & AI Explorer",
            bio="Building intelligent tools and career intelligence engines.",
            location="India",
            github_username="madhav"
        )
        db.add(mock_user)
        db.commit()
        db.refresh(mock_user)
        return mock_user

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

async def exchange_github_code(code: str) -> Optional[dict]:
    """Exchanges a GitHub authorization code for an access token."""
    url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=data)
        if response.status_code != 200:
            return None
        res_data = response.json()
        
        # Verify access token exists in response
        if "access_token" not in res_data:
            return None
            
        # Get user profile info
        user_url = "https://api.github.com/user"
        user_headers = {
            "Authorization": f"Bearer {res_data['access_token']}",
            "Accept": "application/json"
        }
        user_response = await client.get(user_url, headers=user_headers)
        if user_response.status_code != 200:
            return None
            
        profile_data = user_response.json()
        return {
            "access_token": res_data["access_token"],
            "github_username": profile_data["login"],
            "name": profile_data.get("name") or profile_data["login"],
            "email": profile_data.get("email") or f"{profile_data['login']}@users.noreply.github.com",
            "bio": profile_data.get("bio"),
            "location": profile_data.get("location"),
            "avatar_url": profile_data.get("avatar_url")
        }
