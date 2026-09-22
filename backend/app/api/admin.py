from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Header, Query, UploadFile
from pydantic import BaseModel

from app.services.auth_service import (
    create_inspector,
    get_authenticated_user,
    get_profile,
    validate_inspector_username,
)
from app.services.rule_extractor import RuleExtractorService
from app.services.supabase_service import SupabaseService


router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class InspectorCreateRequest(BaseModel):
    username: str
    password: str
    full_name: str
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True


class InspectorUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class StatusUpdateRequest(BaseModel):
    active: bool


class RuleCreateRequest(BaseModel):
    rule_code: str
    rule_name: Optional[str] = None
    title: Optional[str] = None
    rule_number: Optional[str] = None
    description: Optional[str] = None
    requirement: Optional[str] = None
    category: Optional[str] = "GENERAL"
    field_name: Optional[str] = None
    condition_type: str = "field_presence"
    expected_value: Optional[str] = None
    expected_condition: Optional[str] = None
    operator: Optional[str] = "exists"
    severity: str = "MEDIUM"
    mandatory: bool = True
    active: Optional[bool] = None
    is_active: Optional[bool] = None
    penalty_clause: Optional[str] = None
    applicability: Optional[str] = None
    evidence_required: Optional[List[str]] = None
    automation_type: Optional[str] = "AUTOMATED"
    legal_act: Optional[str] = "Legal Metrology (Packaged Commodities) Rules, 2011"
    statutory_reference: Optional[str] = None
    source_document_id: Optional[str] = None
    source_document_name: Optional[str] = None
    source_page: Optional[int] = None
    status: Optional[str] = "APPROVED"
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


class RuleBatchCreateRequest(BaseModel):
    rules: List[RuleCreateRequest]


class RuleUpdateRequest(BaseModel):
    rule_name: Optional[str] = None
    title: Optional[str] = None
    rule_number: Optional[str] = None
    description: Optional[str] = None
    requirement: Optional[str] = None
    category: Optional[str] = None
    field_name: Optional[str] = None
    condition_type: Optional[str] = None
    expected_value: Optional[str] = None
    expected_condition: Optional[str] = None
    operator: Optional[str] = None
    severity: Optional[str] = None
    mandatory: Optional[bool] = None
    active: Optional[bool] = None
    is_active: Optional[bool] = None
    penalty_clause: Optional[str] = None
    applicability: Optional[str] = None
    evidence_required: Optional[List[str]] = None
    automation_type: Optional[str] = None
    legal_act: Optional[str] = None
    statutory_reference: Optional[str] = None
    source_document_id: Optional[str] = None
    source_document_name: Optional[str] = None
    source_page: Optional[int] = None
    status: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


# ============================================================
# AUTHENTICATION & AUTHORIZATION HELPERS
# ============================================================

def require_admin(authorization: Optional[str]) -> Dict[str, Any]:
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

    if profile.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required for this operation",
        )

    if not profile.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Administrator account has been deactivated",
        )

    return profile


# ============================================================
# INSPECTOR MANAGEMENT ENDPOINTS
# ============================================================

@router.get("/inspectors")
def list_inspectors(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    department: Optional[str] = Query(default=None),
    designation: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)

    try:
        inspectors = SupabaseService.get_inspectors(
            search=search,
            is_active=is_active,
            department=department,
            designation=designation,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "data": inspectors,
            "total": len(inspectors),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve inspectors: {str(exc)}",
        )


@router.get("/inspectors/{inspector_id}")
def get_inspector_detail(
    inspector_id: str,
    authorization: Optional[str] = Header(None),
):
    require_admin(authorization)

    inspector = SupabaseService.get_inspector(inspector_id)
    if not inspector:
        raise HTTPException(
            status_code=404,
            detail="Inspector not found",
        )

    return {
        "success": True,
        "data": inspector,
    }


@router.post("/inspectors")
def create_new_inspector(
    request: InspectorCreateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    username = request.username.strip()

    if not validate_inspector_username(username):
        raise HTTPException(
            status_code=400,
            detail="Inspector username must end with .ins (e.g. ravi.ins)",
        )

    try:
        inspector = create_inspector(
            username=username,
            password=request.password,
            full_name=request.full_name,
            phone=request.phone,
            designation=request.designation,
            department=request.department,
        )

        # Audit log
        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="CREATE_INSPECTOR",
                entity_type="profile",
                entity_id=inspector.get("id"),
                description=f"Created inspector {username} ({request.full_name})",
                metadata={"username": username, "department": request.department},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Inspector {username} registered successfully",
            "inspector": inspector,
        }
    except ValueError as val_err:
        raise HTTPException(
            status_code=400,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create inspector: {str(exc)}",
        )


@router.put("/inspectors/{inspector_id}")
def update_inspector_profile(
    inspector_id: str,
    request: InspectorUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        updated = SupabaseService.update_inspector(
            inspector_id=inspector_id,
            data=request.dict(exclude_unset=True),
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="UPDATE_INSPECTOR",
                entity_type="profile",
                entity_id=inspector_id,
                description=f"Updated inspector profile {inspector_id}",
                metadata=request.dict(exclude_unset=True),
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Inspector updated successfully",
            "inspector": updated,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update inspector: {str(exc)}",
        )


@router.patch("/inspectors/{inspector_id}/status")
def toggle_inspector_status(
    inspector_id: str,
    request: StatusUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        updated = SupabaseService.set_inspector_status(
            inspector_id=inspector_id,
            is_active=request.active,
        )

        action = "ACTIVATE_INSPECTOR" if request.active else "DEACTIVATE_INSPECTOR"
        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action=action,
                entity_type="profile",
                entity_id=inspector_id,
                description=f"{action} for officer {inspector_id}",
                metadata={"is_active": request.active},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Inspector status set to {'active' if request.active else 'inactive'}",
            "inspector": updated,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change inspector status: {str(exc)}",
        )


# ============================================================
# COMPLIANCE RULE MANAGEMENT ENDPOINTS
# ============================================================

@router.get("/rules")
def list_rules(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    active: Optional[bool] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)

    try:
        rules = SupabaseService.get_rules(
            search=search,
            category=category,
            active=active,
            status=status,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "data": rules,
            "total": len(rules),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch compliance rules: {str(exc)}",
        )


@router.get("/rules/{rule_id}")
def get_rule_detail(
    rule_id: str,
    authorization: Optional[str] = Header(None),
):
    require_admin(authorization)

    rule = SupabaseService.get_rule(rule_id)
    if not rule:
        raise HTTPException(
            status_code=404,
            detail="Rule not found",
        )

    return {
        "success": True,
        "data": rule,
    }


@router.post("/rules")
def create_rule(
    request: RuleCreateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    payload = request.dict(exclude_unset=True)
    payload["created_by"] = admin.get("id")

    rule_title = payload.get("title") or payload.get("rule_name") or payload.get("rule_code")
    payload["rule_name"] = rule_title
    payload["title"] = rule_title

    rule_desc = payload.get("description") or payload.get("requirement") or ""
    payload["description"] = rule_desc
    payload["requirement"] = rule_desc

    if "is_active" in payload and payload.get("active") is None:
        payload["active"] = payload["is_active"]
    elif "active" in payload and payload.get("is_active") is None:
        payload["is_active"] = payload["active"]
    elif "active" not in payload and "is_active" not in payload:
        payload["active"] = True
        payload["is_active"] = True

    try:
        new_rule = SupabaseService.create_rule(payload)

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="CREATE_RULE",
                entity_type="compliance_rule",
                entity_id=new_rule.get("id"),
                description=f"Created compliance rule {request.rule_code} - {rule_title}",
                metadata={"rule_code": request.rule_code, "category": request.category},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Compliance rule {request.rule_code} registered",
            "rule": new_rule,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create compliance rule: {str(exc)}",
        )


@router.put("/rules/{rule_id}")
def update_rule(
    rule_id: str,
    request: RuleUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    payload = request.dict(exclude_unset=True)
    if "title" in payload and not payload.get("rule_name"):
        payload["rule_name"] = payload["title"]
    elif "rule_name" in payload and not payload.get("title"):
        payload["title"] = payload["rule_name"]

    if "requirement" in payload and not payload.get("description"):
        payload["description"] = payload["requirement"]
    elif "description" in payload and not payload.get("requirement"):
        payload["requirement"] = payload["description"]

    if "is_active" in payload and "active" not in payload:
        payload["active"] = payload["is_active"]
    elif "active" in payload and "is_active" not in payload:
        payload["is_active"] = payload["active"]

    try:
        updated = SupabaseService.update_rule(
            rule_id=rule_id,
            data=payload,
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="UPDATE_RULE",
                entity_type="compliance_rule",
                entity_id=rule_id,
                description=f"Updated compliance rule {rule_id}",
                metadata=request.dict(exclude_unset=True),
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Rule updated successfully",
            "rule": updated,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update compliance rule: {str(exc)}",
        )


@router.post("/rules/{rule_id}/approve")
def approve_rule(
    rule_id: str,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        approved = SupabaseService.approve_rule(
            rule_id=rule_id,
            admin_id=admin.get("id"),
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="APPROVE_RULE",
                entity_type="compliance_rule",
                entity_id=rule_id,
                description=f"Approved compliance rule {approved.get('rule_code')} into active compliance engine",
                metadata={"rule_code": approved.get("rule_code"), "rule_name": approved.get("rule_name")},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Compliance rule {approved.get('rule_code')} approved and activated",
            "rule": approved,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve compliance rule: {str(exc)}",
        )


@router.post("/rules/{rule_id}/reject")
def reject_rule(
    rule_id: str,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        rejected = SupabaseService.reject_rule(
            rule_id=rule_id,
            admin_id=admin.get("id"),
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="REJECT_RULE",
                entity_type="compliance_rule",
                entity_id=rule_id,
                description=f"Rejected draft candidate rule {rejected.get('rule_code')}",
                metadata={"rule_code": rejected.get("rule_code")},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Draft rule {rejected.get('rule_code')} rejected",
            "rule": rejected,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject candidate rule: {str(exc)}",
        )


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        deleted = SupabaseService.delete_rule(
            rule_id=rule_id,
            admin_id=admin.get("id"),
        )

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="DELETE_RULE",
                entity_type="compliance_rule",
                entity_id=rule_id,
                description=f"Deactivated compliance rule {deleted.get('rule_code')} from future inspections",
                metadata={"rule_code": deleted.get("rule_code")},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Compliance rule deactivated. Historical inspection reports remain intact.",
            "rule": deleted,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete compliance rule: {str(exc)}",
        )


@router.patch("/rules/{rule_id}/status")
def toggle_rule_status(
    rule_id: str,
    request: StatusUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        updated = SupabaseService.set_rule_status(
            rule_id=rule_id,
            active=request.active,
        )

        action = "ACTIVATE_RULE" if request.active else "DEACTIVATE_RULE"
        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action=action,
                entity_type="compliance_rule",
                entity_id=rule_id,
                description=f"{action} on rule {rule_id}",
                metadata={"active": request.active},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Rule status set to {'active' if request.active else 'inactive'}",
            "rule": updated,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to toggle rule status: {str(exc)}",
        )


@router.post("/rules/seed")
def seed_default_rules(
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    try:
        result = SupabaseService.seed_initial_rules()

        try:
            SupabaseService.create_audit_log(
                user_id=admin.get("id"),
                action="SEED_BASELINE_RULES",
                entity_type="compliance_rules",
                description=f"Seeded {result.get('seeded_count')} baseline statutory rules into Supabase",
                metadata=result,
            )
        except Exception:
            pass

        return {
            "success": True,
            **result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed baseline rules: {str(exc)}",
        )


@router.get("/rule-documents")
def list_rule_documents(
    authorization: Optional[str] = Header(None),
    limit: int = Query(default=50, ge=1, le=100),
):
    require_admin(authorization)

    try:
        docs = SupabaseService.get_rule_documents(limit=limit)
        return {
            "success": True,
            "data": docs,
            "total": len(docs),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch statutory rule documents: {str(exc)}",
        )


# ============================================================
# STATUTORY RULE DOCUMENT UPLOAD & EXTRACTION
# ============================================================

@router.post("/rules/upload")
async def upload_rule_document(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    filename = file.filename or "statutory_document.pdf"
    ext = filename.lower().split(".")[-1]
    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Please upload a PDF, DOCX, or DOC rules document.",
        )

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = RuleExtractorService.process_and_store_document(
            file_bytes=file_bytes,
            filename=filename,
            admin_id=admin.get("id"),
        )
        return {
            "success": True,
            **result,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process and extract rules from document: {str(exc)}",
        )


@router.post("/rules/batch")
def batch_create_rules(
    request: RuleBatchCreateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)

    saved_rules = []
    errors = []

    for rule_req in request.rules:
        payload = rule_req.dict()
        payload["created_by"] = admin.get("id")
        try:
            saved = SupabaseService.create_rule(payload)
            saved_rules.append(saved)
        except Exception as e:
            errors.append(f"Rule {rule_req.rule_code}: {str(e)}")

    try:
        SupabaseService.create_audit_log(
            user_id=admin.get("id"),
            action="BATCH_CONFIRM_RULES",
            entity_type="compliance_rule",
            entity_id=saved_rules[0].get("id") if saved_rules else None,
            description=f"Admin confirmed and activated {len(saved_rules)} statutory rules into Supabase.",
            metadata={"confirmed_count": len(saved_rules), "failed_count": len(errors)},
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Successfully activated {len(saved_rules)} statutory rules.",
        "confirmed_count": len(saved_rules),
        "rules": saved_rules,
        "errors": errors,
    }


# ============================================================
# ADMIN ANALYTICS ENDPOINT
# ============================================================

@router.get("/analytics")
def get_analytics(
    authorization: Optional[str] = Header(None),
):
    require_admin(authorization)

    try:
        analytics = SupabaseService.get_admin_analytics()
        return {
            "success": True,
            "data": analytics,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute platform analytics: {str(exc)}",
        )


# ============================================================
# AUDIT LOGS ENDPOINT
# ============================================================

@router.get("/audit-logs")
def get_audit_logs(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)

    try:
        logs = SupabaseService.get_audit_logs(
            search=search,
            action=action,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "data": logs,
            "total": len(logs),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch audit logs: {str(exc)}",
        )


# ============================================================
# CONSUMER SCAN ISSUES & USER SUBMITTED ISSUES (ADMIN)
# ============================================================

class IssueStatusUpdateRequest(BaseModel):
    status: str
    admin_notes: Optional[str] = None


@router.get("/consumer-scan-issues")
def get_consumer_scan_issues(
    authorization: Optional[str] = Header(None),
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)
    from app.services.consumer_service import ConsumerService
    return ConsumerService.get_admin_scan_issues(
        status=status,
        priority=priority,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.put("/consumer-scan-issues/{issue_id}")
def update_consumer_scan_issue(
    issue_id: str,
    request: IssueStatusUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)
    from app.services.consumer_service import ConsumerService
    updated = ConsumerService.update_admin_scan_issue(
        issue_id=issue_id,
        status=request.status,
        admin_notes=request.admin_notes,
        admin_id=admin.get("id", "admin"),
    )
    return {"success": True, "data": updated}


@router.get("/consumer-issues")
def get_consumer_issues(
    authorization: Optional[str] = Header(None),
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)
    from app.services.consumer_service import ConsumerService
    return ConsumerService.get_admin_user_issues(
        status=status,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.put("/consumer-issues/{issue_id}")
def update_consumer_issue(
    issue_id: str,
    request: IssueStatusUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    admin = require_admin(authorization)
    from app.services.consumer_service import ConsumerService
    updated = ConsumerService.update_admin_user_issue(
        issue_id=issue_id,
        status=request.status,
        admin_notes=request.admin_notes,
        admin_id=admin.get("id", "admin"),
    )
    return {"success": True, "data": updated}


# ============================================================
# INSPECTOR RULE REQUESTS (ADMIN REVIEW & NOTIFICATIONS)
# ============================================================

class RuleRequestReviewUpdate(BaseModel):
    status: str
    admin_response: Optional[str] = None


@router.get("/rule-requests")
def get_admin_rule_requests(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, UNDER_REVIEW, RESOLVED, REJECTED, ALL"),
    limit: int = Query(100, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    """
    Fetches all Inspector Rule Requests for Administrator review and notification display.
    """
    require_admin(authorization)
    requests = SupabaseService.get_admin_rule_requests(status=status, limit=limit)
    return {
        "success": True,
        "total": len(requests),
        "data": requests,
        "requests": requests,
    }


@router.patch("/rule-requests/{request_id}")
def review_rule_request(
    request_id: str,
    body: RuleRequestReviewUpdate,
    authorization: Optional[str] = Header(None),
):
    """
    Admin reviews, responds to, and updates status of an inspector's rule request.
    Allowed statuses: UNDER_REVIEW, RESOLVED, REJECTED.
    """
    admin = require_admin(authorization)
    admin_id = admin.get("id")

    try:
        updated = SupabaseService.update_rule_request(
            request_id=request_id,
            status=body.status,
            admin_response=body.admin_response,
            admin_id=admin_id,
        )
        return {
            "success": True,
            "message": f"Rule request marked as {body.status.upper()}",
            "data": updated,
            "request": updated,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update rule request: {str(e)}",
        )


