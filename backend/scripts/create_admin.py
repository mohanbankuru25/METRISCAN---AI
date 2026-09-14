import os
import re

from dotenv import load_dotenv
from supabase import create_client


# ============================================================
# LOAD BACKEND .ENV
# ============================================================

BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

ENV_FILE = os.path.join(
    BACKEND_DIR,
    ".env"
)

load_dotenv(ENV_FILE)


# ============================================================
# SUPABASE CONFIGURATION
# ============================================================

SUPABASE_URL = os.getenv(
    "SUPABASE_URL"
)

SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY"
)


if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing in backend/.env"
    )


if not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_SECRET_KEY is missing in backend/.env"
    )


# ============================================================
# SUPABASE ADMIN CLIENT
# ============================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


# ============================================================
# USERNAME VALIDATION
# ============================================================

def validate_admin_username(username):

    pattern = r"^[a-zA-Z0-9_]+\.admin$"

    return bool(
        re.fullmatch(
            pattern,
            username
        )
    )


# ============================================================
# PASSWORD VALIDATION
# ============================================================

def validate_password(password):

    return len(password) >= 8


# ============================================================
# CREATE ADMIN
# ============================================================

def create_admin():

    print()
    print("=" * 60)
    print("       METRISCAN - CREATE INITIAL ADMIN")
    print("=" * 60)
    print()


    # --------------------------------------------------------
    # ADMIN USERNAME
    # --------------------------------------------------------

    while True:

        username = input(
            "Enter admin username: "
        ).strip()


        if not validate_admin_username(username):

            print()
            print(
                "ERROR: Username must end with .admin"
            )

            print(
                "Example: mohan.admin"
            )

            print()

            continue


        break


    # --------------------------------------------------------
    # ADMIN PASSWORD
    # --------------------------------------------------------

    while True:

        password = input(
            "Enter admin password: "
        )


        if not validate_password(password):

            print()
            print(
                "ERROR: Password must contain "
                "at least 8 characters."
            )

            print()

            continue


        confirm_password = input(
            "Confirm admin password: "
        )


        if password != confirm_password:

            print()
            print(
                "ERROR: Passwords do not match."
            )

            print()

            continue


        break


    # --------------------------------------------------------
    # CHECK EXISTING USERNAME
    # --------------------------------------------------------

    print()
    print(
        "Checking existing users..."
    )


    existing = (
        supabase
        .table("profiles")
        .select("id, username")
        .eq("username", username)
        .execute()
    )


    if existing.data:

        print()
        print(
            "ERROR: This username already exists."
        )

        print(
            "Username:",
            username
        )

        return


    # --------------------------------------------------------
    # INTERNAL AUTH EMAIL
    # --------------------------------------------------------

    auth_email = (
        username +
        "@metriscanauth.local"
    )


    # --------------------------------------------------------
    # CREATE SUPABASE AUTH USER
    # --------------------------------------------------------

    print()
    print(
        "Creating Supabase Auth account..."
    )


    try:

        result = (
            supabase
            .auth
            .admin
            .create_user({

                "email": auth_email,

                "password": password,

                "email_confirm": True,

                "user_metadata": {

                    "username": username,

                    "role": "admin"
                }
            })
        )


        user = result.user


        if not user:

            raise RuntimeError(
                "Supabase Auth user creation failed."
            )


        # ----------------------------------------------------
        # CREATE PROFILE
        # ----------------------------------------------------

        print(
            "Creating admin profile..."
        )


        profile_data = {

            "id": str(user.id),

            "username": username,

            "full_name":
                username.replace(
                    ".admin",
                    ""
                ),

            "email": auth_email,

            "role": "admin",

            "designation":
                "Administrator",

            "is_active": True
        }


        (
            supabase
            .table("profiles")
            .insert(profile_data)
            .execute()
        )


        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("          ADMIN CREATED SUCCESSFULLY")
        print("=" * 60)
        print()

        print(
            "Username :",
            username
        )

        print(
            "Role     : ADMIN"
        )

        print(
            "Status   : ACTIVE"
        )

        print()

        print(
            "Password was entered securely."
        )

        print(
            "It is NOT stored in this Python file."
        )

        print()


    except Exception as error:

        print()
        print("=" * 60)
        print("           ADMIN CREATION FAILED")
        print("=" * 60)
        print()

        print(
            "Error:",
            error
        )

        print()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    create_admin()