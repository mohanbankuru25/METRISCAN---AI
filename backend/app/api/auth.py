from typing import Optional

from fastapi import (
    APIRouter,
    HTTPException,
    Header
)

from pydantic import BaseModel

from app.services.auth_service import (
    login_user,
    create_inspector,
    get_authenticated_user,
    get_profile
)
from app.services.supabase_service import SupabaseService


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# ============================================================
# REQUEST MODELS
# ============================================================

class LoginRequest(BaseModel):

    username: str
    password: str



class CreateInspectorRequest(BaseModel):

    username: str
    password: str
    full_name: str
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    recaptcha_token: Optional[str] = None


# ============================================================
# GET BEARER TOKEN
# ============================================================

def extract_token(authorization):

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Authorization header is required"
        )


    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )


    return authorization.split(
        " ",
        1
    )[1]


# ============================================================
# ADMIN AUTHORIZATION
# ============================================================

def require_admin(authorization):

    token = extract_token(
        authorization
    )


    try:

        user = get_authenticated_user(
            token
        )

        profile = get_profile(
            str(user.id)
        )

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication"
        )


    if profile.get("role") != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )


    if not profile.get("is_active"):

        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )


    return profile


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(request: LoginRequest):

    # --------------------------------------------------------
    # Login
    # --------------------------------------------------------

    try:

        result = login_user(
            request.username,
            request.password
        )

    except Exception as error:

        raise HTTPException(
            status_code=401,
            detail=str(error)
        )

    session = result["session"]
    profile = result["profile"]

    try:
        SupabaseService.create_audit_log(
            user_id=profile.get("id"),
            action="USER_LOGIN",
            entity_type="profile",
            entity_id=profile.get("id"),
            description=f"User {profile.get('username')} logged in as {profile.get('role')}",
            metadata={"role": profile.get("role"), "username": profile.get("username")}
        )
    except Exception:
        pass

    return {

        "success": True,

        "message": "Login successful",

        "access_token":
            session.access_token,

        "refresh_token":
            session.refresh_token,

        "token_type":
            "bearer",

        "expires_in":
            session.expires_in,

        "profile":
            profile
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")

# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def current_user(
    authorization: str = Header(None)
):

    token = extract_token(
        authorization
    )


    try:

        user = get_authenticated_user(
            token
        )

        profile = get_profile(
            str(user.id)
        )

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication"
        )


    if not profile.get("is_active"):

        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )


    return {

        "success": True,

        "profile": profile
    }


# ============================================================
# LOGOUT
# ============================================================

@router.post("/logout")
def logout(
    authorization: str = Header(None)
):
    user_id = None
    try:
        token = extract_token(authorization)
        user = get_authenticated_user(token)
        user_id = str(user.id)
    except Exception:
        pass

    if user_id:
        try:
            SupabaseService.create_audit_log(
                user_id=user_id,
                action="USER_LOGOUT",
                entity_type="profile",
                entity_id=user_id,
                description="User logged out of the application"
            )
        except Exception:
            pass

    return {
        "success": True,
        "message": "Logged out successfully"
    }


# ============================================================
# ADMIN → CREATE INSPECTOR
# ============================================================

@router.post("/create-inspector")
def admin_create_inspector(
    request: CreateInspectorRequest,
    authorization: str = Header(None)
):

    # --------------------------------------------------------
    # Admin authentication
    # --------------------------------------------------------

    admin = require_admin(
        authorization
    )


    # --------------------------------------------------------
    # Create inspector
    # --------------------------------------------------------

    try:

        inspector = create_inspector(

            username=request.username,

            password=request.password,

            full_name=request.full_name,

            phone=request.phone,

            designation=request.designation,

            department=request.department
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="CREATE_INSPECTOR",
                entity_type="profile",
                entity_id=inspector.get("id"),
                description=f"Admin created inspector {request.username}",
                metadata={"username": request.username, "department": request.department}
            )
        except Exception:
            pass

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    return {

        "success": True,

        "message":
            "Inspector created successfully",

        "inspector":
            inspector
    }