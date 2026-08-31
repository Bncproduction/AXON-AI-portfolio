"""Users, suppliers, instruments, defects, parts, audit logs."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import (
    DbSession,
    RequireAdmin,
    RequireQualityManager,
    RequireViewer,
    audit,
)
from app.core.security import hash_password
from app.models import AuditLog, Defect, Instrument, Part, Supplier, User
from app.schemas import (
    DefectOut,
    InstrumentCreate,
    InstrumentOut,
    PartCreate,
    PartOut,
    SupplierCreate,
    SupplierOut,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(tags=["masters"])


# --------------------------------------------------------------------------- users
@router.get("/users", response_model=list[UserOut])
def list_users(db: DbSession, _: RequireAdmin) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)))


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(db: DbSession, actor: RequireAdmin, body: UserCreate, request: Request) -> User:
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists")
    user = User(
        email=email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        employee_code=body.employee_code,
    )
    db.add(user)
    db.flush()
    audit(db, actor, "user.create", "user", user.id, {"role": user.role}, request)
    db.commit()
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    db: DbSession, actor: RequireAdmin, user_id: int, body: UserUpdate, request: Request
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    data = body.model_dump(exclude_unset=True)
    if password := data.pop("password", None):
        user.hashed_password = hash_password(password)
    for key, value in data.items():
        setattr(user, key, value)
    audit(db, actor, "user.update", "user", user.id, data, request)
    db.commit()
    return user


# --------------------------------------------------------------------------- suppliers
@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: DbSession, _: RequireViewer) -> list[Supplier]:
    return list(db.scalars(select(Supplier).order_by(Supplier.name)))


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    db: DbSession, actor: RequireQualityManager, body: SupplierCreate, request: Request
) -> Supplier:
    if db.scalar(select(Supplier).where(Supplier.code == body.code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Supplier code already exists")
    supplier = Supplier(**body.model_dump())
    db.add(supplier)
    db.flush()
    audit(db, actor, "supplier.create", "supplier", supplier.id, request=request)
    db.commit()
    return supplier


# --------------------------------------------------------------------------- instruments
@router.get("/instruments", response_model=list[InstrumentOut])
def list_instruments(db: DbSession, _: RequireViewer) -> list[Instrument]:
    return list(db.scalars(select(Instrument).order_by(Instrument.name)))


@router.post("/instruments", response_model=InstrumentOut, status_code=status.HTTP_201_CREATED)
def create_instrument(
    db: DbSession, actor: RequireQualityManager, body: InstrumentCreate, request: Request
) -> Instrument:
    if db.scalar(select(Instrument).where(Instrument.code == body.code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Instrument code already exists")
    instrument = Instrument(**body.model_dump())
    db.add(instrument)
    db.flush()
    audit(db, actor, "instrument.create", "instrument", instrument.id, request=request)
    db.commit()
    return instrument


# --------------------------------------------------------------------------- defects
@router.get("/defects", response_model=list[DefectOut])
def list_defects(db: DbSession, _: RequireViewer) -> list[Defect]:
    return list(db.scalars(select(Defect).order_by(Defect.name)))


# --------------------------------------------------------------------------- parts
@router.get("/parts", response_model=list[PartOut])
def list_parts(db: DbSession, _: RequireViewer, q: str | None = None) -> list[Part]:
    stmt = select(Part).order_by(Part.part_number)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Part.part_number.ilike(like) | Part.part_name.ilike(like))
    return list(db.scalars(stmt))


@router.post("/parts", response_model=PartOut, status_code=status.HTTP_201_CREATED)
def create_part(
    db: DbSession, actor: RequireQualityManager, body: PartCreate, request: Request
) -> Part:
    if db.scalar(select(Part).where(Part.part_number == body.part_number)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Part number already exists")
    part = Part(**body.model_dump())
    db.add(part)
    db.flush()
    audit(db, actor, "part.create", "part", part.id, request=request)
    db.commit()
    return part


# --------------------------------------------------------------------------- audit
@router.get("/audit-logs")
def list_audit_logs(db: DbSession, _: RequireAdmin, limit: int = 200) -> list[dict]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 1000)))
    return [
        {
            "id": r.id,
            "actor": r.actor_email,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "payload": r.payload,
            "ip_address": r.ip_address,
            "created_at": r.created_at,
        }
        for r in rows
    ]
