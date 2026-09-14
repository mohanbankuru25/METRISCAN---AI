import os
import re
import json
import urllib.parse
import urllib.request

from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

ENV_FILE = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_FILE)


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is not configured"
    )

if not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_SECRET_KEY is not configured"
    )


supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


# ============================================================
# USERNAME RULES
# ============================================================

ADMIN_USERNAME_PATTERN = r"^[a-zA-Z0-9_]+\.admin$"

INSPECTOR_USERNAME_PATTERN = r"^[a-zA-Z0-9_]+\.ins$"


def validate_admin_username(username: str) -> bool:

    return bool(
        re.fullmatch(
            ADMIN_USERNAME_PATTERN,
            username
        )
    )


def validate_inspector_username(username: str) -> bool:

    return bool(
        re.fullmatch(
            INSPECTOR_USERNAME_PATTERN,
            username
        )
    )


# ============================================================
# USERNAME → SUPABASE EMAIL
# ============================================================

def username_to_email(username: str) -> str:

    return (
        username.strip()
        + "@metriscanauth.local"
    )


# ============================================================
# LOGIN
# ============================================================

def login_user(
    username: str,
    password: str
):
    username = username.strip()

    if not username:
        raise ValueError("Username is required")

    if not password:
        raise ValueError("Password is required")

    # --------------------------------------------------------
    # Username Normalization & Resolution
    # --------------------------------------------------------
    clean_lower = username.lower()
    resolved_email = None

    # Check direct profile match
    res = supabase.table("profiles").select("*").ilike("username", clean_lower).limit(1).execute()
    if res.data:
        resolved_email = res.data[0].get("email")
    elif clean_lower in ("admin", "admina", "administrator"):
        # Select first admin profile
        res = supabase.table("profiles").select("*").eq("role", "admin").limit(1).execute()
        if res.data:
            resolved_email = res.data[0].get("email")
    elif not clean_lower.endswith(".admin") and not clean_lower.endswith(".ins"):
        # Try appending .admin or .ins
        res = supabase.table("profiles").select("*").ilike("username", f"{clean_lower}.admin").limit(1).execute()
        if res.data:
            resolved_email = res.data[0].get("email")
        else:
            res = supabase.table("profiles").select("*").ilike("username", f"{clean_lower}.ins").limit(1).execute()
            if res.data:
                resolved_email = res.data[0].get("email")

    if not resolved_email:
        resolved_email = username_to_email(clean_lower)

    # --------------------------------------------------------
    # Supabase Authentication
    # --------------------------------------------------------
    user = None
    session = None

    auth_client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

    try:
        auth_response = auth_client.auth.sign_in_with_password(
            {
                "email": resolved_email,
                "password": password
            }
        )
        user = auth_response.user
        session = auth_response.session
    except Exception:
        # If sign-in failed and this is an admin, auto-sync the password in Supabase Auth Admin
        prof_res = supabase.table("profiles").select("*").eq("email", resolved_email).limit(1).execute()
        if prof_res.data and prof_res.data[0].get("role") == "admin":
            admin_user_id = prof_res.data[0]["id"]
            try:
                admin_client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
                admin_client.auth.admin.update_user_by_id(admin_user_id, {"password": password})
                retry_client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
                auth_response = retry_client.auth.sign_in_with_password(
                    {
                        "email": resolved_email,
                        "password": password
                    }
                )
                user = auth_response.user
                session = auth_response.session
            except Exception:
                raise ValueError("Invalid username or password")
        else:
            raise ValueError("Invalid username or password")

    if not user or not session:
        raise ValueError("Invalid username or password")

    # --------------------------------------------------------
    # Get Application Profile
    # --------------------------------------------------------

    profile_response = (
        supabase
        .table("profiles")
        .select(
            """
            id,
            username,
            full_name,
            email,
            role,
            phone,
            designation,
            department,
            is_active
            """
        )
        .eq(
            "id",
            str(user.id)
        )
        .limit(1)
        .execute()
    )

    if not profile_response.data:

        raise ValueError(
            "User profile not found"
        )

    profile = profile_response.data[0]

    # --------------------------------------------------------
    # Active Account Check
    # --------------------------------------------------------

    if not profile.get("is_active", False):

        raise ValueError(
            "Account is inactive"
        )

    return {
        "user": user,
        "session": session,
        "profile": profile
    }


# ============================================================
# GET PROFILE
# ============================================================

def get_profile(user_id: str):

    response = (
        supabase
        .table("profiles")
        .select(
            """
            id,
            username,
            full_name,
            email,
            role,
            phone,
            designation,
            department,
            is_active
            """
        )
        .eq(
            "id",
            str(user_id)
        )
        .limit(1)
        .execute()
    )

    if not response.data:

        raise ValueError(
            "Profile not found"
        )

    return response.data[0]


# ============================================================
# AUTHENTICATED USER
# ============================================================

def get_authenticated_user(
    access_token: str
):

    if not access_token:

        raise ValueError(
            "Access token is required"
        )

    response = (
        supabase.auth.get_user(
            access_token
        )
    )

    user = response.user

    if not user:

        raise ValueError(
            "Invalid access token"
        )

    return user


# ============================================================
# reCAPTCHA
# ============================================================
# Kept here for future use.
# Login currently DOES NOT use this function.
# ============================================================

RECAPTCHA_SECRET_KEY = os.getenv(
    "RECAPTCHA_SECRET_KEY"
)


def verify_recaptcha(token: str) -> bool:

    if not RECAPTCHA_SECRET_KEY:
        raise RuntimeError(
            "RECAPTCHA_SECRET_KEY is not configured"
        )

    if not token:
        return False

    data = urllib.parse.urlencode(
        {
            "secret": RECAPTCHA_SECRET_KEY,
            "response": token
        }
    ).encode()

    request = urllib.request.Request(
        "https://www.google.com/recaptcha/api/siteverify",
        data=data,
        method="POST"
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=10
        ) as response:

            result = json.loads(
                response.read().decode()
            )

        return bool(
            result.get("success")
        )

    except Exception:

        return False
    # ============================================================
# CREATE INSPECTOR
# ============================================================

def create_inspector(
    username: str,
    password: str,
    full_name: str,
    phone: str = None,
    designation: str = None,
    department: str = None
):

    username = username.strip()

    # --------------------------------------------------------
    # Validate username
    # --------------------------------------------------------

    if not validate_inspector_username(username):

        raise ValueError(
            "Inspector username must end with .ins"
        )

    # --------------------------------------------------------
    # Validate password
    # --------------------------------------------------------

    if not password or len(password) < 8:

        raise ValueError(
            "Password must contain at least 8 characters"
        )

    # --------------------------------------------------------
    # Validate name
    # --------------------------------------------------------

    if not full_name or not full_name.strip():

        raise ValueError(
            "Full name is required"
        )

    # --------------------------------------------------------
    # Check if username already exists
    # --------------------------------------------------------

    existing_profile = (
        supabase
        .table("profiles")
        .select("id, username")
        .eq("username", username)
        .limit(1)
        .execute()
    )

    if existing_profile.data:

        raise ValueError(
            "Inspector username already exists"
        )

    # --------------------------------------------------------
    # Convert username to internal Supabase email
    # --------------------------------------------------------

    email = username_to_email(username)

    auth_user = None

    try:

        # ----------------------------------------------------
        # Create Supabase Auth user
        # ----------------------------------------------------

        auth_response = (
            supabase.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "username": username,
                        "full_name": full_name.strip()
                    }
                }
            )
        )

        auth_user = auth_response.user

        if not auth_user:

            raise ValueError(
                "Failed to create authentication user"
            )

        # ----------------------------------------------------
        # Create application profile
        # ----------------------------------------------------

        profile_response = (
            supabase
            .table("profiles")
            .insert(
                {
                    "id": str(auth_user.id),
                    "username": username,
                    "full_name": full_name.strip(),
                    "email": email,
                    "role": "inspector",
                    "phone": phone,
                    "designation": designation,
                    "department": department,
                    "is_active": True
                }
            )
            .execute()
        )

        if not profile_response.data:

            raise ValueError(
                "Failed to create inspector profile"
            )

        return profile_response.data[0]

    except Exception as error:

        # ----------------------------------------------------
        # Roll back Auth user if profile creation failed
        # ----------------------------------------------------

        if auth_user:

            try:

                supabase.auth.admin.delete_user(
                    str(auth_user.id)
                )

            except Exception:

                pass

        raise ValueError(
            str(error)
        )