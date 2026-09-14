import os
import uuid
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")


if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is not configured")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_SECRET_KEY is not configured")


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


def get_admin_client() -> Client:
    """
    Returns a fresh, unpolluted client authenticated with SUPABASE_SECRET_KEY.
    Use for administrative operations like auth.admin.create_user, auth.admin.list_users, etc.
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def create_auth_client() -> Client:
    """
    Returns an ephemeral client for authenticating user sessions (sign_in_with_password)
    so the shared service_role credentials are never overridden with user JWTs.
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)


class SupabaseService:

    # ========================================================
    # HEALTH
    # ========================================================

    @staticmethod
    def health() -> Dict[str, Any]:
        try:
            response = (
                supabase
                .table("profiles")
                .select("id")
                .limit(1)
                .execute()
            )

            return {
                "connected": True,
                "data": response.data
            }

        except Exception as exc:
            return {
                "connected": False,
                "error": str(exc)
            }

    # ========================================================
    # PROFILE
    # ========================================================

    @staticmethod
    def get_profile(user_id: str) -> Optional[Dict[str, Any]]:

        response = (
            supabase
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]

        return None

    # ========================================================
    # PRODUCT
    # ========================================================

    @staticmethod
    def create_product(product_data: Dict[str, Any]) -> Dict[str, Any]:

        response = (
            supabase
            .table("products")
            .insert(product_data)
            .execute()
        )

        if not response.data:
            raise RuntimeError("Product insertion failed")

        return response.data[0]

    # ========================================================
    # INSPECTION
    # ========================================================

    @staticmethod
    def create_inspection(
        inspector_id: Optional[str],
        product_id: str,
        status: str,
        compliance_score: Optional[float],
        counts: Dict[str, int]
    ) -> Dict[str, Any]:

        inspection_number = (
            "INS-"
            + uuid.uuid4().hex[:10].upper()
        )

        data = {
            "inspection_number": inspection_number,
            "inspector_id": inspector_id,
            "product_id": product_id,
            "status": status,
            "compliance_score": compliance_score,

            "total_rules": counts.get(
                "total", 0
            ),

            "passed_rules": counts.get(
                "pass", 0
            ),

            "failed_rules": counts.get(
                "fail", 0
            ),

            "review_rules": counts.get(
                "review", 0
            ),

            "not_applicable_rules": counts.get(
                "not_applicable", 0
            ),

            "out_of_scope_rules": counts.get(
                "out_of_scope", 0
            )
        }

        response = (
            supabase
            .table("inspections")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Inspection insertion failed"
            )

        return response.data[0]

    # ========================================================
    # OCR RESULT
    # ========================================================

    @staticmethod
    def save_ocr_result(
        inspection_id: str,
        full_text: str,
        text_blocks: List[Any],
        confidence: Optional[float],
        bbox_count: int
    ) -> Dict[str, Any]:

        data = {
            "inspection_id": inspection_id,
            "full_text": full_text,
            "text_blocks": text_blocks,
            "confidence": confidence,
            "bbox_count": bbox_count
        }

        response = (
            supabase
            .table("ocr_results")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "OCR result insertion failed"
            )

        return response.data[0]

    # ========================================================
    # COMPLIANCE RESULTS
    # ========================================================

    @staticmethod
    def save_compliance_results(
        inspection_id: str,
        rules: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:

        records = []

        for rule in rules:

            records.append({
                "inspection_id": inspection_id,

                "rule_id": str(
                    rule.get("rule_id", "")
                ),

                "rule_name": rule.get(
                    "rule_name"
                ),

                "requirement": rule.get(
                    "requirement"
                ),

                "status": rule.get(
                    "status",
                    "REVIEW"
                ),

                "evidence": rule.get(
                    "evidence"
                ),

                "recommendation": rule.get(
                    "recommendation"
                )
            })

        if not records:
            return []

        response = (
            supabase
            .table("compliance_results")
            .insert(records)
            .execute()
        )

        return response.data or []

    # ========================================================
    # VISUAL ANALYSIS
    # ========================================================

    @staticmethod
    def save_visual_analysis(
        inspection_id: str,
        visual_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:

        text_size = visual_analysis.get(
            "text_size",
            {}
        )

        placement = visual_analysis.get(
            "placement",
            {}
        )

        readability = visual_analysis.get(
            "readability",
            {}
        )

        declaration_visibility = (
            visual_analysis.get(
                "declaration_visibility",
                {}
            )
        )

        data = {
            "inspection_id": inspection_id,

            "engine": visual_analysis.get(
                "engine"
            ),

            "text_blocks": visual_analysis.get(
                "image",
                {}
            ).get(
                "text_blocks"
            ),

            "median_height": text_size.get(
                "median_height"
            ),

            "min_height": text_size.get(
                "min_height"
            ),

            "max_height": text_size.get(
                "max_height"
            ),

            "mean_ocr_confidence":
                readability.get(
                    "mean_ocr_confidence"
                ),

            "high_confidence_ratio":
                readability.get(
                    "high_confidence_ratio"
                ),

            "local_contrast":
                readability.get(
                    "local_contrast"
                ),

            "detected_declarations":
                declaration_visibility.get(
                    "detected_declarations"
                ),

            "bbox_count":
                placement.get(
                    "bbox_count"
                ),

            "calibrated":
                visual_analysis.get(
                    "image",
                    {}
                ).get(
                    "calibrated",
                    False
                ),

            "text_size_status":
                text_size.get(
                    "status"
                ),

            "placement_status":
                placement.get(
                    "status"
                ),

            "readability_status":
                readability.get(
                    "status"
                ),

            "declaration_visibility_status":
                declaration_visibility.get(
                    "status"
                ),

            "raw_analysis":
                visual_analysis
        }

        response = (
            supabase
            .table("visual_analysis")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Visual analysis insertion failed"
            )

        return response.data[0]

    # ========================================================
    # EVIDENCE
    # ========================================================

    @staticmethod
    def save_evidence(
        inspection_id: str,
        evidence_type: str,
        storage_path: str,
        public_url: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:

        data = {
            "inspection_id": inspection_id,
            "evidence_type": evidence_type,
            "storage_path": storage_path,
            "public_url": public_url,
            "description": description
        }

        response = (
            supabase
            .table("inspection_evidence")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Evidence insertion failed"
            )

        return response.data[0]

    # ========================================================
    # REPORT
    # ========================================================

    @staticmethod
    def save_report(
        inspection_id: str,
        report_number: str,
        pdf_path: Optional[str],
        docx_path: Optional[str],
        generated_by: Optional[str]
    ) -> Dict[str, Any]:

        data = {
            "inspection_id": inspection_id,
            "report_number": report_number,
            "pdf_path": pdf_path,
            "docx_path": docx_path,
            "generated_by": generated_by
        }

        response = (
            supabase
            .table("reports")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Report insertion failed"
            )

        return response.data[0]

    # ========================================================
    # HISTORY
    # ========================================================

    @staticmethod
    def get_inspection_history(
        inspector_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:

        query = (
            supabase
            .table("inspections")
            .select(
                """
                *,
                products(*)
                """
            )
            .order(
                "inspection_date",
                desc=True
            )
            .limit(limit)
        )

        if inspector_id:
            query = query.eq(
                "inspector_id",
                inspector_id
            )

        response = query.execute()

        return response.data or []

    # ========================================================
    # SINGLE INSPECTION
    # ========================================================

    @staticmethod
    def get_inspection(
        inspection_id: str
    ) -> Optional[Dict[str, Any]]:

        response = (
            supabase
            .table("inspections")
            .select(
                """
                *,
                products(*),
                compliance_results(*),
                ocr_results(*),
                visual_analysis(*),
                inspection_evidence(*),
                reports(*)
                """
            )
            .eq(
                "id",
                inspection_id
            )
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]

        # Check by inspection_number as fallback
        response = (
            supabase
            .table("inspections")
            .select(
                """
                *,
                products(*),
                compliance_results(*),
                ocr_results(*),
                visual_analysis(*),
                inspection_evidence(*),
                reports(*)
                """
            )
            .eq(
                "inspection_number",
                inspection_id
            )
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]

        return None

    # ========================================================
    # AUDIT LOG
    # ========================================================

    @staticmethod
    def create_audit_log(
        user_id: Optional[str],
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:

        data = {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "description": description,
            "metadata": metadata or {}
        }

        response = (
            supabase
            .table("audit_logs")
            .insert(data)
            .execute()
        )

        if not response.data:
            raise RuntimeError(
                "Audit log insertion failed"
            )

        return response.data[0]

    # ========================================================
    # AUDIT LOGS QUERY
    # ========================================================

    @staticmethod
    def get_audit_logs(
        search: Optional[str] = None,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = (
            supabase
            .table("audit_logs")
            .select("*, profiles(full_name, username, role)")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if action:
            query = query.eq("action", action)

        if user_id:
            query = query.eq("user_id", user_id)

        response = query.execute()
        logs = response.data or []

        if search:
            s = search.lower()
            logs = [
                log for log in logs
                if s in str(log.get("action", "")).lower()
                or s in str(log.get("entity_type", "")).lower()
                or s in str(log.get("description", "")).lower()
                or (log.get("profiles") and s in str(log["profiles"].get("username", "")).lower())
                or (log.get("profiles") and s in str(log["profiles"].get("full_name", "")).lower())
            ]

        return logs

    # ========================================================
    # STORAGE OPERATIONS
    # ========================================================

    @staticmethod
    def upload_file(
        bucket_name: str,
        file_path: str,
        content: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        try:
            supabase.storage.from_(bucket_name).upload(
                path=file_path,
                file=content,
                file_options={"content-type": content_type, "upsert": "true"}
            )
        except Exception:
            # Fallback upload without file_options if client variant requires
            supabase.storage.from_(bucket_name).upload(
                path=file_path,
                file=content
            )

        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        return public_url

    @staticmethod
    def download_file(
        bucket_name: str,
        file_path: str
    ) -> bytes:
        return supabase.storage.from_(bucket_name).download(file_path)

    @staticmethod
    def get_file_url(
        bucket_name: str,
        file_path: str
    ) -> str:
        return supabase.storage.from_(bucket_name).get_public_url(file_path)

    # ========================================================
    # INSPECTOR MANAGEMENT
    # ========================================================

    @staticmethod
    def get_inspectors(
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        department: Optional[str] = None,
        designation: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = (
            supabase
            .table("profiles")
            .select("*")
            .eq("role", "inspector")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if is_active is not None:
            query = query.eq("is_active", is_active)

        if department:
            query = query.eq("department", department)

        if designation:
            query = query.eq("designation", designation)

        response = query.execute()
        inspectors = response.data or []

        if search:
            s = search.lower()
            inspectors = [
                ins for ins in inspectors
                if s in str(ins.get("username", "")).lower()
                or s in str(ins.get("full_name", "")).lower()
                or s in str(ins.get("department", "")).lower()
                or s in str(ins.get("designation", "")).lower()
                or s in str(ins.get("phone", "")).lower()
            ]

        # Attach inspection stats for each inspector
        for ins in inspectors:
            try:
                insp_res = (
                    supabase
                    .table("inspections")
                    .select("status", count="exact")
                    .eq("inspector_id", ins["id"])
                    .execute()
                )
                ins["inspections_count"] = insp_res.count if insp_res.count is not None else len(insp_res.data or [])
            except Exception:
                ins["inspections_count"] = 0

        return inspectors

    @staticmethod
    def get_inspector(inspector_id: str) -> Optional[Dict[str, Any]]:
        response = (
            supabase
            .table("profiles")
            .select("*")
            .eq("id", inspector_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None

        inspector = response.data[0]

        # Count stats
        try:
            inspections_res = (
                supabase
                .table("inspections")
                .select("id, status, compliance_score, inspection_date")
                .eq("inspector_id", inspector_id)
                .order("inspection_date", desc=True)
                .limit(10)
                .execute()
            )
            inspector["recent_inspections"] = inspections_res.data or []
        except Exception:
            inspector["recent_inspections"] = []

        return inspector

    @staticmethod
    def update_inspector(
        inspector_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        allowed_fields = [
            "full_name", "phone", "designation", "department", "is_active"
        ]
        payload = {k: v for k, v in data.items() if k in allowed_fields}

        response = (
            supabase
            .table("profiles")
            .update(payload)
            .eq("id", inspector_id)
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to update inspector profile")
        return response.data[0]

    @staticmethod
    def set_inspector_status(
        inspector_id: str,
        is_active: bool
    ) -> Dict[str, Any]:
        return SupabaseService.update_inspector(inspector_id, {"is_active": is_active})

    # ========================================================
    # DYNAMIC COMPLIANCE RULES MANAGEMENT
    # ========================================================

    @staticmethod
    def get_rules(
        search: Optional[str] = None,
        category: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = (
            supabase
            .table("compliance_rules")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if active is not None:
            query = query.eq("active", active)

        if category:
            query = query.eq("category", category)

        response = query.execute()
        rules = response.data or []

        if search:
            s = search.lower()
            rules = [
                r for r in rules
                if s in str(r.get("rule_code", "")).lower()
                or s in str(r.get("rule_name", "")).lower()
                or s in str(r.get("field_name", "")).lower()
                or s in str(r.get("category", "")).lower()
                or s in str(r.get("description", "")).lower()
            ]

        return rules

    @staticmethod
    def get_rule(rule_id: str) -> Optional[Dict[str, Any]]:
        response = (
            supabase
            .table("compliance_rules")
            .select("*")
            .eq("id", rule_id)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None

    @staticmethod
    def create_rule(data: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = [
            "rule_code", "rule_name", "description", "category",
            "field_name", "condition_type", "expected_value", "operator",
            "severity", "mandatory", "active", "effective_from", "effective_to",
            "created_by"
        ]
        payload = {k: v for k, v in data.items() if k in allowed_fields and v is not None}

        # Normalize severity to uppercase
        if "severity" in payload:
            payload["severity"] = str(payload["severity"]).upper()
            if payload["severity"] not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
                payload["severity"] = "MEDIUM"

        # Check if rule with same rule_code already exists
        rule_code = payload.get("rule_code")
        if rule_code:
            try:
                existing = (
                    supabase
                    .table("compliance_rules")
                    .select("id")
                    .eq("rule_code", rule_code)
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    existing_id = existing.data[0]["id"]
                    update_payload = {k: v for k, v in payload.items() if k not in ("created_by", "id")}
                    res = (
                        supabase
                        .table("compliance_rules")
                        .update(update_payload)
                        .eq("id", existing_id)
                        .execute()
                    )
                    return res.data[0] if res.data else {"id": existing_id, **payload}
            except Exception:
                pass

        response = (
            supabase
            .table("compliance_rules")
            .insert(payload)
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to create compliance rule")
        return response.data[0]

    @staticmethod
    def update_rule(rule_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = [
            "rule_name", "description", "category", "field_name",
            "condition_type", "expected_value", "operator", "severity",
            "mandatory", "active", "effective_from", "effective_to"
        ]
        payload = {k: v for k, v in data.items() if k in allowed_fields}

        if "severity" in payload:
            payload["severity"] = str(payload["severity"]).upper()
            if payload["severity"] not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
                payload["severity"] = "MEDIUM"

        response = (
            supabase
            .table("compliance_rules")
            .update(payload)
            .eq("id", rule_id)
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to update compliance rule")
        return response.data[0]

    @staticmethod
    def set_rule_status(rule_id: str, active: bool) -> Dict[str, Any]:
        return SupabaseService.update_rule(rule_id, {"active": active})

    @staticmethod
    def get_active_compliance_rules() -> List[Dict[str, Any]]:
        """
        Retrieve all active compliance rules currently effective for inspection scans.
        """
        try:
            response = (
                supabase
                .table("compliance_rules")
                .select("*")
                .eq("active", True)
                .execute()
            )
            rules = response.data or []
            return rules
        except Exception as e:
            print(f"Warning: Failed to fetch active compliance rules from Supabase: {e}")
            return []

    # ========================================================
    # FILTERED INSPECTIONS
    # ========================================================

    @staticmethod
    def get_inspections_filtered(
        inspector_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = (
            supabase
            .table("inspections")
            .select("*, products(*), profiles(id, full_name, username, department)")
            .order("inspection_date", desc=True)
            .range(offset, offset + limit - 1)
        )

        if inspector_id:
            query = query.eq("inspector_id", inspector_id)

        if status and status.upper() != "ALL":
            query = query.eq("status", status.upper())

        response = query.execute()
        records = response.data or []

        if search:
            s = search.lower()
            records = [
                rec for rec in records
                if s in str(rec.get("inspection_number", "")).lower()
                or (rec.get("products") and s in str(rec["products"].get("product_name", "")).lower())
                or (rec.get("products") and s in str(rec["products"].get("category", "")).lower())
                or (rec.get("profiles") and s in str(rec["profiles"].get("full_name", "")).lower())
                or (rec.get("profiles") and s in str(rec["profiles"].get("username", "")).lower())
            ]

        return records

    # ========================================================
    # REPORTS LISTING & GET
    # ========================================================

    @staticmethod
    def get_reports(
        inspector_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        select_clause = (
            "*, inspections!inner(inspection_number, status, compliance_score, inspection_date, inspector_id, products(product_name, category)), profiles(full_name, username)"
            if inspector_id
            else "*, inspections(inspection_number, status, compliance_score, inspection_date, inspector_id, products(product_name, category)), profiles(full_name, username)"
        )
        query = (
            supabase
            .table("reports")
            .select(select_clause)
            .order("generated_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if inspector_id:
            query = query.eq("inspections.inspector_id", inspector_id)

        response = query.execute()
        reports = response.data or []
        # Filter out any orphaned reports missing inspection relation
        reports = [r for r in reports if r.get("inspections")]

        if search:
            s = search.lower()
            reports = [
                r for r in reports
                if s in str(r.get("report_number", "")).lower()
                or (r.get("inspections") and s in str(r["inspections"].get("inspection_number", "")).lower())
                or (r.get("inspections") and r["inspections"].get("products") and s in str(r["inspections"]["products"].get("product_name", "")).lower())
                or (r.get("profiles") and s in str(r["profiles"].get("full_name", "")).lower())
            ]

        return reports

    @staticmethod
    def _is_uuid(val: Any) -> bool:
        try:
            uuid.UUID(str(val).strip())
            return True
        except (ValueError, TypeError, AttributeError):
            return False

    @staticmethod
    def get_report(report_id: str) -> Optional[Dict[str, Any]]:
        full_select = "*, inspections(*, products(*), compliance_results(*), ocr_results(*), visual_analysis(*), inspection_evidence(*)), profiles(*)"
        rid_str = str(report_id).strip()

        # 1. Query by primary key id (if UUID)
        if SupabaseService._is_uuid(rid_str):
            try:
                response = (
                    supabase
                    .table("reports")
                    .select(full_select)
                    .eq("id", rid_str)
                    .limit(1)
                    .execute()
                )
                if response.data:
                    return response.data[0]
            except Exception:
                pass

            # 2. Query by inspection_id (if UUID)
            try:
                response = (
                    supabase
                    .table("reports")
                    .select(full_select)
                    .eq("inspection_id", rid_str)
                    .limit(1)
                    .execute()
                )
                if response.data:
                    return response.data[0]
            except Exception:
                pass

        # 3. Query by report_number
        try:
            response = (
                supabase
                .table("reports")
                .select(full_select)
                .eq("report_number", rid_str)
                .limit(1)
                .execute()
            )
            if response.data:
                return response.data[0]
        except Exception:
            pass

        # 4. In case report_id was an inspection_number like 'INS-...'
        try:
            insp_res = (
                supabase
                .table("inspections")
                .select("id")
                .eq("inspection_number", rid_str)
                .limit(1)
                .execute()
            )
            if insp_res.data:
                actual_insp_id = insp_res.data[0]["id"]
                return SupabaseService.get_report(actual_insp_id)
        except Exception:
            pass

        return None

    @staticmethod
    def get_report_by_inspection_id(inspection_id: str) -> Optional[Dict[str, Any]]:
        return SupabaseService.get_report(inspection_id)

    # ========================================================
    # ADMIN ANALYTICS
    # ========================================================

    @staticmethod
    def get_admin_analytics() -> Dict[str, Any]:
        # Inspectors count
        inspectors_res = (
            supabase
            .table("profiles")
            .select("id, is_active, role, department, designation")
            .eq("role", "inspector")
            .execute()
        )
        inspectors = inspectors_res.data or []
        total_inspectors = len(inspectors)
        active_inspectors = sum(1 for i in inspectors if i.get("is_active"))
        inactive_inspectors = total_inspectors - active_inspectors

        # Inspections count and distribution
        inspections_res = (
            supabase
            .table("inspections")
            .select("id, status, compliance_score, inspection_date, product_id, inspector_id, products(product_name, category)")
            .order("inspection_date", desc=True)
            .limit(500)
            .execute()
        )
        inspections = inspections_res.data or []
        total_inspections = len(inspections)

        pass_count = sum(1 for i in inspections if str(i.get("status")).upper() == "PASS")
        fail_count = sum(1 for i in inspections if str(i.get("status")).upper() == "FAIL")
        review_count = sum(1 for i in inspections if str(i.get("status")).upper() == "REVIEW")

        scores = [float(i["compliance_score"]) for i in inspections if i.get("compliance_score") is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        # Category distribution
        categories: Dict[str, int] = {}
        for i in inspections:
            cat = "General"
            if i.get("products") and isinstance(i["products"], dict) and i["products"].get("category"):
                cat = i["products"]["category"]
            categories[cat] = categories.get(cat, 0) + 1

        # Violations by rule category
        violations_res = (
            supabase
            .table("compliance_results")
            .select("rule_name, status, requirement")
            .eq("status", "FAIL")
            .limit(200)
            .execute()
        )
        violations = violations_res.data or []
        violation_counts: Dict[str, int] = {}
        for v in violations:
            name = v.get("rule_name") or "Statutory Requirement"
            violation_counts[name] = violation_counts.get(name, 0) + 1

        # Inspections timeline (last 7 recorded dates)
        timeline_dict: Dict[str, int] = {}
        for i in inspections:
            date_str = str(i.get("inspection_date", ""))[:10]
            if date_str:
                timeline_dict[date_str] = timeline_dict.get(date_str, 0) + 1

        timeline = [
            {"date": d, "count": c}
            for d, c in sorted(timeline_dict.items(), key=lambda x: x[0], reverse=True)[:7]
        ]
        timeline.reverse()

        # Rules count
        rules_res = (
            supabase
            .table("compliance_rules")
            .select("id, active, mandatory")
            .execute()
        )
        rules = rules_res.data or []
        total_rules = len(rules)
        active_rules = sum(1 for r in rules if r.get("active"))

        return {
            "total_inspectors": total_inspectors,
            "active_inspectors": active_inspectors,
            "inactive_inspectors": inactive_inspectors,
            "total_inspections": total_inspections,
            "pass_count": pass_count,
            "fail_count": fail_count,
            "review_count": review_count,
            "average_compliance_score": avg_score,
            "total_rules": total_rules,
            "active_rules": active_rules,
            "categories": categories,
            "violation_frequency": [
                {"name": k, "count": v} for k, v in sorted(violation_counts.items(), key=lambda x: x[1], reverse=True)[:8]
            ],
            "timeline": timeline,
            "recent_inspections": inspections[:6]
        }

    # ========================================================
    # INSPECTOR ANALYTICS
    # ========================================================

    @staticmethod
    def get_inspector_analytics(inspector_id: str) -> Dict[str, Any]:
        inspections_res = (
            supabase
            .table("inspections")
            .select("id, status, compliance_score, inspection_date, products(product_name, category)")
            .eq("inspector_id", inspector_id)
            .order("inspection_date", desc=True)
            .limit(200)
            .execute()
        )
        inspections = inspections_res.data or []
        total = len(inspections)
        passed = sum(1 for i in inspections if str(i.get("status")).upper() == "PASS")
        failed = sum(1 for i in inspections if str(i.get("status")).upper() == "FAIL")
        review = sum(1 for i in inspections if str(i.get("status")).upper() == "REVIEW")

        scores = [float(i["compliance_score"]) for i in inspections if i.get("compliance_score") is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        return {
            "total_inspections": total,
            "passed": passed,
            "failed": failed,
            "review": review,
            "average_score": avg_score,
            "recent_inspections": inspections[:10]
        }