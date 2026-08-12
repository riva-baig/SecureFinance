from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
import pyotp
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("securefin")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 15
REFRESH_DAYS = 7
FRONTEND_URL = os.environ["FRONTEND_URL"]
RESET_EMAIL_MODE = os.environ["RESET_EMAIL_MODE"]

app = FastAPI(title="SecureFin API")
api_router = APIRouter(prefix="/api")
collections = {"transactions", "investments", "subscriptions", "budgets"}


class AuthInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterInput(AuthInput):
    name: str = Field(min_length=2, max_length=80)
    confirm_password: str
    demo_data: bool = True


class ResetInput(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TwoFactorCode(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class RecordInput(BaseModel):
    model_config = ConfigDict(extra="allow")
    amount: Optional[float] = None
    name: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None


class ProfileInput(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    currency: Optional[str] = None
    date_format: Optional[str] = None
    notifications: Optional[bool] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except (ValueError, TypeError):
        return False


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "name": user.get("name", "SecureFin user"),
        "email": user["email"],
        "role": user.get("role", "user"),
        "two_factor_enabled": bool(user.get("two_factor_enabled", False)),
        "created_at": user.get("created_at"),
    }


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user: Dict[str, Any]) -> None:
    response.set_cookie("access_token", create_access_token(user["id"], user["email"]), httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user["id"]), httponly=True, secure=True, samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="You need to sign in to access this page.")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid session.")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Session expired.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session.")


def password_score(password: str) -> int:
    score = 0
    score += len(password) >= 12
    score += any(c.isupper() for c in password)
    score += any(c.islower() for c in password)
    score += any(c.isdigit() for c in password)
    score += any(not c.isalnum() for c in password)
    return int(score)


def demo_records(user_id: str) -> Dict[str, List[Dict[str, Any]]]:
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    return {
        "transactions": [
            {"id": str(uuid.uuid4()), "user_id": user_id, "type": "income", "amount": 92000, "category": "Salary", "description": "Monthly salary", "date": f"{month}-01", "payment_method": "Bank transfer", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "type": "expense", "amount": 1850, "category": "Food", "description": "Weekend dining", "date": f"{month}-05", "payment_method": "UPI", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "type": "expense", "amount": 4200, "category": "Bills", "description": "Home utilities", "date": f"{month}-08", "payment_method": "Card", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "type": "expense", "amount": 2300, "category": "Transport", "description": "Metro and cabs", "date": f"{month}-11", "payment_method": "Card", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "type": "expense", "amount": 1299, "category": "Entertainment", "description": "Annual streaming plan", "date": f"{month}-12", "payment_method": "Card", "is_demo": True},
        ],
        "investments": [
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Nifty 50 Index", "type": "ETF", "amount": 125000, "current_value": 138400, "purchase_date": f"{month}-02", "quantity": 42, "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Bluechip Growth Fund", "type": "Mutual Fund", "amount": 85000, "current_value": 91450, "purchase_date": f"{month}-04", "quantity": 118, "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Digital Gold", "type": "Gold", "amount": 42000, "current_value": 44700, "purchase_date": f"{month}-07", "quantity": 7, "is_demo": True},
        ],
        "subscriptions": [
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Netflix", "amount": 649, "billing_cycle": "Monthly", "next_billing_date": f"{month}-22", "category": "Entertainment", "payment_method": "Card", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Cloud storage", "amount": 130, "billing_cycle": "Monthly", "next_billing_date": f"{month}-25", "category": "Software", "payment_method": "Card", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Fitness studio", "amount": 1800, "billing_cycle": "Monthly", "next_billing_date": f"{month}-28", "category": "Health", "payment_method": "UPI", "is_demo": True},
        ],
        "budgets": [
            {"id": str(uuid.uuid4()), "user_id": user_id, "category": "Food", "limit": 8000, "spent": 3650, "period": "This month", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "category": "Shopping", "limit": 12000, "spent": 7200, "period": "This month", "is_demo": True},
            {"id": str(uuid.uuid4()), "user_id": user_id, "category": "Transport", "limit": 5000, "spent": 2300, "period": "This month", "is_demo": True},
        ],
    }


async def seed_user_data(user_id: str) -> None:
    for collection, records in demo_records(user_id).items():
        if records:
            await db[collection].insert_many(records)
    await db.notifications.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "title": "Welcome to SecureFin", "message": "Your starter workspace is ready. Demo records are clearly marked.", "kind": "financial", "read": False, "created_at": now_iso()})


@api_router.get("/")
async def root():
    return {"message": "SecureFin API online"}


@api_router.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if password_score(payload.password) < 3:
        raise HTTPException(status_code=400, detail="Please choose a stronger password.")
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = {"id": str(uuid.uuid4()), "name": payload.name.strip(), "email": email, "password_hash": hash_password(payload.password), "role": "user", "two_factor_enabled": False, "created_at": now_iso(), "password_changed_at": now_iso()}
    await db.users.insert_one(user)
    if payload.demo_data:
        await seed_user_data(user["id"])
    set_auth_cookies(response, user)
    return public_user(user)


@api_router.post("/auth/login")
async def login(payload: AuthInput, request: Request, response: Response, two_factor_code: Optional[str] = None):
    email = payload.email.lower()
    identifier = f"{request.client.host if request.client else 'unknown'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("locked_until") and datetime.fromisoformat(attempt["locked_until"]) > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        count = (attempt or {}).get("count", 0) + 1
        update = {"identifier": identifier, "count": count, "last_attempt": now_iso()}
        if count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if user.get("two_factor_enabled"):
        if not two_factor_code:
            raise HTTPException(status_code=428, detail="Two-factor code required.")
        if not pyotp.TOTP(user.get("two_fa_secret", "")).verify(two_factor_code):
            raise HTTPException(status_code=401, detail="Invalid two-factor code.")
    await db.login_attempts.delete_one({"identifier": identifier})
    await db.security_events.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "event": "Successful login", "device": request.headers.get("user-agent", "Unknown browser")[:100], "location": "Current session", "severity": "good", "created_at": now_iso()})
    set_auth_cookies(response, user)
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out securely."}


@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh session missing.")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError()
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise ValueError()
        response.set_cookie("access_token", create_access_token(user["id"], user["email"]), httponly=True, secure=True, samesite="none", max_age=900, path="/")
        return {"message": "Session refreshed."}
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Refresh session expired.")


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: Dict[str, str]):
    email = payload.get("email", "").lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    message = "If an account exists, a reset link has been prepared."
    if not user:
        return {"message": message}
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({"token": hashlib.sha256(token.encode()).hexdigest(), "user_id": user["id"], "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "used": False})
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    logger.warning("Password reset link (development delivery): %s", reset_link)
    result = {"message": message}
    if RESET_EMAIL_MODE == "console":
        result["development_token"] = token
        result["delivery"] = "console"
    return result


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetInput):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    record = await db.password_reset_tokens.find_one({"token": token_hash, "used": False}, {"_id": 0})
    if not record or datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link is invalid or expired.")
    await db.users.update_one({"id": record["user_id"]}, {"$set": {"password_hash": hash_password(payload.password), "password_changed_at": now_iso()}})
    await db.password_reset_tokens.update_one({"token": token_hash}, {"$set": {"used": True}})
    return {"message": "Password updated. You can sign in now."}


@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordInput, user: Dict[str, Any] = Depends(get_current_user)):
    if not verify_password(payload.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password), "password_changed_at": now_iso()}})
    return {"message": "Password changed successfully."}


@api_router.post("/auth/2fa/setup")
async def setup_2fa(user: Dict[str, Any] = Depends(get_current_user)):
    secret = pyotp.random_base32()
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_fa_secret_pending": secret}})
    uri = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="SecureFin")
    return {"secret": secret, "otpauth_uri": uri, "message": "Scan this secret with your authenticator app, then verify a code."}


@api_router.post("/auth/2fa/verify")
async def verify_2fa(payload: TwoFactorCode, user: Dict[str, Any] = Depends(get_current_user)):
    secret = user.get("two_fa_secret_pending")
    if not secret or not pyotp.TOTP(secret).verify(payload.code):
        raise HTTPException(status_code=400, detail="That authenticator code is not valid.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_fa_secret": secret, "two_factor_enabled": True}, "$unset": {"two_fa_secret_pending": ""}})
    return {"message": "Two-factor authentication enabled."}


@api_router.post("/auth/2fa/disable")
async def disable_2fa(user: Dict[str, Any] = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_enabled": False}, "$unset": {"two_fa_secret": "", "two_fa_secret_pending": ""}})
    return {"message": "Two-factor authentication disabled."}


def financial_totals(records: List[Dict[str, Any]]) -> Dict[str, float]:
    income = sum(float(r.get("amount") or 0) for r in records if r.get("type") == "income")
    expenses = sum(float(r.get("amount") or 0) for r in records if r.get("type") == "expense")
    return {"income": income, "expenses": expenses, "balance": income - expenses}


@api_router.get("/dashboard")
async def dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    uid = user["id"]
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(500)
    investments = await db.investments.find({"user_id": uid}, {"_id": 0}).to_list(500)
    subscriptions = await db.subscriptions.find({"user_id": uid}, {"_id": 0}).to_list(500)
    totals = financial_totals(transactions)
    investment_value = sum(float(r.get("current_value", r.get("amount", 0)) or 0) for r in investments)
    investment_cost = sum(float(r.get("amount", 0) or 0) for r in investments)
    monthly_subscriptions = sum(float(r.get("amount", 0) or 0) for r in subscriptions if str(r.get("billing_cycle", "Monthly")).lower() == "monthly")
    categories: Dict[str, float] = {}
    for item in transactions:
        if item.get("type") == "expense":
            categories[item.get("category", "Other")] = categories.get(item.get("category", "Other"), 0) + float(item.get("amount", 0) or 0)
    score = 88 if user.get("two_factor_enabled") else 76
    return {"totals": {**totals, "investments": investment_value, "investment_cost": investment_cost, "monthly_subscriptions": monthly_subscriptions, "return_percent": ((investment_value - investment_cost) / investment_cost * 100) if investment_cost else 0}, "security_score": score, "security_label": "Excellent" if score >= 85 else "Good", "spending_breakdown": [{"name": k, "value": round(v, 2)} for k, v in categories.items()], "transactions": transactions[-8:][::-1], "investments": investments, "subscriptions": subscriptions}


@api_router.get("/analytics")
async def analytics(user: Dict[str, Any] = Depends(get_current_user)):
    uid = user["id"]
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    by_month: Dict[str, Dict[str, float]] = {}
    for item in transactions:
        month = str(item.get("date", now_iso()))[:7]
        by_month.setdefault(month, {"income": 0, "expenses": 0})
        by_month[month]["income" if item.get("type") == "income" else "expenses"] += float(item.get("amount", 0) or 0)
    totals = financial_totals(transactions)
    return {"monthly": [{"month": k, **v} for k, v in sorted(by_month.items())], "savings_rate": (totals["balance"] / totals["income"] * 100) if totals["income"] else 0, "totals": totals}


@api_router.get("/notifications")
async def notifications(user: Dict[str, Any] = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api_router.get("/security/events")
async def security_events(user: Dict[str, Any] = Depends(get_current_user)):
    return await db.security_events.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api_router.get("/profile")
async def profile(user: Dict[str, Any] = Depends(get_current_user)):
    settings = await db.user_settings.find_one({"user_id": user["id"]}, {"_id": 0}) or {"currency": "INR", "date_format": "DD MMM YYYY", "notifications": True}
    return {**public_user(user), "settings": settings}


@api_router.put("/profile")
async def update_profile(payload: ProfileInput, user: Dict[str, Any] = Depends(get_current_user)):
    values = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in values:
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": values.pop("name")}})
    if values:
        await db.user_settings.update_one({"user_id": user["id"]}, {"$set": {"user_id": user["id"], **values}}, upsert=True)
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(updated)


@api_router.delete("/demo-data")
async def delete_demo_data(user: Dict[str, Any] = Depends(get_current_user)):
    deleted = 0
    for collection in collections:
        result = await db[collection].delete_many({"user_id": user["id"], "is_demo": True})
        deleted += result.deleted_count
    return {"message": f"Removed {deleted} starter records."}


@api_router.get("/search")
async def global_search(q: str = "", user: Dict[str, Any] = Depends(get_current_user)):
    query = q.strip()
    if not query:
        return []
    results = []
    for collection in collections:
        items = await db[collection].find({"user_id": user["id"], "$or": [{"name": {"$regex": query, "$options": "i"}}, {"description": {"$regex": query, "$options": "i"}}, {"category": {"$regex": query, "$options": "i"}}]}, {"_id": 0}).to_list(20)
        results.extend([{**item, "record_type": collection[:-1]} for item in items])
    return results[:30]


@api_router.get("/{collection}")
async def list_records(collection: str, search: str = "", user: Dict[str, Any] = Depends(get_current_user)):
    if collection not in collections:
        raise HTTPException(status_code=404, detail="Resource not found.")
    query: Dict[str, Any] = {"user_id": user["id"]}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}, {"category": {"$regex": search, "$options": "i"}}]
    return await db[collection].find(query, {"_id": 0}).sort("date", -1).to_list(500)


@api_router.post("/{collection}")
async def create_record(collection: str, payload: RecordInput, user: Dict[str, Any] = Depends(get_current_user)):
    if collection not in collections:
        raise HTTPException(status_code=404, detail="Resource not found.")
    data = payload.model_dump(exclude_none=True)
    if data.get("amount") is not None and float(data["amount"]) <= 0:
        raise HTTPException(status_code=400, detail="Please enter a valid amount.")
    data.update({"id": str(uuid.uuid4()), "user_id": user["id"], "is_demo": False, "created_at": now_iso()})
    await db[collection].insert_one(data)
    data.pop("_id", None)
    return data


@api_router.put("/{collection}/{record_id}")
async def update_record(collection: str, record_id: str, payload: RecordInput, user: Dict[str, Any] = Depends(get_current_user)):
    if collection not in collections:
        raise HTTPException(status_code=404, detail="Resource not found.")
    data = payload.model_dump(exclude_none=True)
    if data.get("amount") is not None and float(data["amount"]) <= 0:
        raise HTTPException(status_code=400, detail="Please enter a valid amount.")
    result = await db[collection].find_one_and_update({"id": record_id, "user_id": user["id"]}, {"$set": data}, projection={"_id": 0}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Record not found.")
    return result


@api_router.delete("/{collection}/{record_id}")
async def delete_record(collection: str, record_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if collection not in collections:
        raise HTTPException(status_code=404, detail="Resource not found.")
    result = await db[collection].delete_one({"id": record_id, "user_id": user["id"]})
    if result.deleted_count != 1:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"message": "Record removed."}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=[FRONTEND_URL, "http://localhost:3000"], allow_origin_regex=r"https://.*\.preview\.emergentagent\.com", allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.login_attempts.create_index("identifier")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    admin = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not admin:
        await db.users.insert_one({"id": str(uuid.uuid4()), "name": "SecureFin Admin", "email": admin_email, "password_hash": hash_password(admin_password), "role": "admin", "two_factor_enabled": False, "created_at": now_iso(), "password_changed_at": now_iso()})
    elif not verify_password(admin_password, admin.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()