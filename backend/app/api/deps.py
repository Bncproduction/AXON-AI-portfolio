"""Shared FastAPI dependencies: auth, RBAC and audit logging."""

from __future__ import annotations

from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import ROLE_RANK, AuditLog, User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise credentials_error from None

    email = payload.get("sub")
    if not email:
        raise credentials_error
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(minimum: UserRole):
    """Dependency factory enforcing the role hierarchy."""

    def _guard(user: CurrentUser) -> User:
        if ROLE_RANK.get(user.role, -1) < ROLE_RANK[minimum]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role '{minimum.value}' or higher",
            )
        return user

    return _guard


RequireViewer = Annotated[User, Depends(require_role(UserRole.viewer))]
RequireInspector = Annotated[User, Depends(require_role(UserRole.inspector))]
RequireQualityManager = Annotated[User, Depends(require_role(UserRole.quality_manager))]
RequireAdmin = Annotated[User, Depends(require_role(UserRole.admin))]


def audit(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    payload: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """Record a state change. Caller commits."""
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            ip_address=request.client.host if request and request.client else None,
        )
    )
