from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field

from app.services.auth_service import get_authenticated_user, get_profile
from app.services.supabase_service import SupabaseService


router = APIRouter(
    prefix="/api/inspector",
    tags=["Inspector Rules & Requests"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class RuleRequestCreate(BaseModel):
    rule_id: Optional[str] = None
    rule_code: Optional[str] = None
    request_type: Optional[str] = "Suggest Rule Change"
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    evidence_url: Optional[str] = None
    evidence_attachment_url: Optional[str] = None


# ============================================================
# AUTHENTICATION & AUTHORIZATION HELPERS
# ============================================================

def require_inspector(authorization: Optional[str]) -> Dict[str, Any]:
    """
    Validates that the caller is an authenticated Inspector (or Admin).
    Extracts the user's verified profile from Supabase.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization bearer token required",
        )

    token = authorization.split(" ", 1)[1]

    try:
        user = get_authenticated_user(token)
        profile = get_profile(str(user.id))
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired authentication session: {str(e)}",
        )

    role = profile.get("role")
    if role not in ("inspector", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Inspector access required for this operation",
        )

    if not profile.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Inspector account has been deactivated",
        )

    return {**profile, "id": str(user.id)}


# ============================================================
# READ-ONLY STATUTORY RULES (SOURCE OF TRUTH: SUPABASE)
# ============================================================

@router.get("/rules")
def get_inspector_rules(
    search: Optional[str] = Query(None, description="Search rule code, title, description, or reference"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    active_only: Optional[bool] = Query(False, description="Filter only active rules"),
    authorization: Optional[str] = Header(None),
):
    """
    Read-only view of statutory compliance rules for inspectors.
    Rules are sourced directly from Supabase (the single source of truth updated by Admins).
    Inspectors cannot edit, create, delete, enable, or disable rules.
    """
    # Verify inspector authentication
    require_inspector(authorization)

    search_val = search if isinstance(search, str) else None
    cat_val = category if isinstance(category, str) else None
    sev_val = severity if isinstance(severity, str) else None
    active_val = bool(active_only) if not hasattr(active_only, "default") else False

    # Fetch rules from Supabase (excluding soft-deleted)
    all_rules = SupabaseService.get_rules(
        search=search_val,
        category=cat_val,
        include_deleted=False,
        limit=200,
    )

    # Only approved or baseline rules are displayed to inspectors
    inspector_rules = [
        r for r in all_rules
        if r.get("status") in ("APPROVED", "ACTIVE", None)
    ]

    if active_val:
        inspector_rules = [
            r for r in inspector_rules
            if r.get("active") or r.get("is_active")
        ]

    if sev_val and sev_val.upper() != "ALL":
        inspector_rules = [
            r for r in inspector_rules
            if str(r.get("severity", "")).upper() == sev_val.upper()
        ]

    return {
        "success": True,
        "total": len(inspector_rules),
        "data": inspector_rules,
        "rules": inspector_rules,
    }


# ============================================================
# INSPECTOR RULE REQUESTS (SUBMIT & VIEW OWN REQUESTS)
# ============================================================

@router.post("/rule-requests", status_code=201)
def submit_rule_request(
    request: RuleRequestCreate,
    authorization: Optional[str] = Header(None),
):
    """
    Allows an inspector to submit a suggestion, report an incorrect rule,
    or report missing rules. The request is persisted in Supabase with status='PENDING'
    and triggers an Admin notification.
    """
    inspector = require_inspector(authorization)
    inspector_id = inspector["id"]

    ev_url = request.evidence_url or request.evidence_attachment_url
    if ev_url and not str(ev_url).strip():
        ev_url = None

    rule_id_clean = request.rule_id
    if rule_id_clean and not str(rule_id_clean).strip():
        rule_id_clean = None

    rule_code_clean = request.rule_code
    if rule_code_clean and not str(rule_code_clean).strip():
        rule_code_clean = None

    payload = {
        "inspector_id": inspector_id,
        "rule_id": rule_id_clean,
        "rule_code": rule_code_clean,
        "request_type": request.request_type or "Suggest Rule Change",
        "subject": request.subject.strip(),
        "description": request.description.strip(),
        "evidence_url": ev_url,
    }

    try:
        new_request = SupabaseService.create_rule_request(payload)
        return {
            "success": True,
            "message": "Rule request submitted successfully. Administrator will review your submission.",
            "data": new_request,
            "request": new_request,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit rule request: {str(e)}",
        )


@router.get("/rule-requests")
def get_my_rule_requests(
    authorization: Optional[str] = Header(None),
):
    """
    Returns all rule requests submitted by the authenticated inspector.
    Displays current status and any admin resolution notes.
    """
    inspector = require_inspector(authorization)
    inspector_id = inspector["id"]

    try:
        requests = SupabaseService.get_inspector_rule_requests(inspector_id)
        return {
            "success": True,
            "total": len(requests),
            "data": requests,
            "requests": requests,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch your rule requests: {str(e)}",
        )
