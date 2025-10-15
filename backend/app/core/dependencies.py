from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.core.config import settings
from app.crud import user as user_crud
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_db() -> Generator:
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token.
    Returns None if no token or invalid token (for optional authentication).
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    user = user_crud.get_user_by_id(db, user_id=user_id)
    return user


def require_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """
    Require authenticated user.
    Raises 401 if not authenticated.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
