from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Header, Query

from app.services.auth_service import get_authenticated_user, get_profile
from app.services.supabase_service import SupabaseService


router = APIRouter(
    prefix="/api/inspections",
    tags=["Inspections"],
)


# ============================================================
# SUPABASE HEALTH
# ============================================================

@router.get("/health")
def supabase_health():
    result = SupabaseService.health()
    if not result.get("connected"):
        raise HTTPException(
            status_code=500,
            detail=result,
        )
    return result


# ============================================================
# INSPECTION HISTORY / LISTING
# ============================================================

@router.get("/")
def get_inspections(
    authorization: Optional[str] = Header(None),
    inspector_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    # Optional authorization check: If an inspector is authenticated,
    # and not an admin, automatically scope to their inspector_id
    scoped_inspector_id = inspector_id
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            user = get_authenticated_user(token)
            profile = get_profile(str(user.id))
            if profile.get("role") == "inspector":
                scoped_inspector_id = str(user.id)
        except Exception:
            pass

    try:
        data = SupabaseService.get_inspections_filtered(
            inspector_id=scoped_inspector_id,
            status=status,
            search=search,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "data": data,
            "total": len(data),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# ============================================================
# SINGLE INSPECTION
# ============================================================

@router.get("/{inspection_id}")
def get_inspection(
    inspection_id: str,
    authorization: Optional[str] = Header(None),
):
    try:
        result = SupabaseService.get_inspection(inspection_id)

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Inspection not found",
            )

        # If authenticated as inspector, verify ownership
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ", 1)[1]
                user = get_authenticated_user(token)
                profile = get_profile(str(user.id))
                if profile.get("role") == "inspector":
                    if result.get("inspector_id") and result["inspector_id"] != str(user.id):
                        raise HTTPException(
                            status_code=403,
                            detail="Access denied: Cannot view another inspector's private inspection",
                        )
            except HTTPException:
                raise
            except Exception:
                pass

        return {
            "success": True,
            "data": result,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )