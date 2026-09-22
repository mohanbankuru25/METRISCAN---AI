import json
import os
import uuid
from datetime import datetime, timezone
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

    _rule_requests_store: Dict[str, Dict[str, Any]] = {}

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
    # DYNAMIC COMPLIANCE RULES MANAGEMENT & PERSISTENCE
    # ========================================================

    BASE_RULE_FIELDS = [
        "rule_code", "rule_name", "description", "category",
        "field_name", "condition_type", "expected_value", "operator",
        "severity", "mandatory", "active", "effective_from", "effective_to",
        "created_by"
    ]

    EXTENDED_RULE_FIELDS = [
        "rule_number", "requirement", "applicability", "expected_condition",
        "evidence_required", "automation_type", "legal_act", "statutory_reference",
        "source_document_id", "source_document_name", "source_page",
        "extraction_confidence", "status", "approved_by", "approved_at", "is_deleted",
        "penalty_clause"
    ]

    @staticmethod
    def _unpack_rule(rule: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unpacks rule records and merges any structured metadata stored in the description envelope.
        Ensures all expected dynamic rule attributes are present.
        """
        if not isinstance(rule, dict):
            return rule

        record = dict(rule)
        desc = record.get("description") or ""

        # Check for metadata envelope inside description
        if "__METRISCAN_META__:" in desc:
            try:
                parts = desc.split("\n", 1)
                meta_json = parts[0].replace("__METRISCAN_META__:", "").strip()
                clean_desc = parts[1] if len(parts) > 1 else ""
                meta = json.loads(meta_json)
                if isinstance(meta, dict):
                    for k, v in meta.items():
                        if record.get(k) is None and v is not None:
                            record[k] = v
                record["description"] = clean_desc
            except Exception:
                pass

        # Normalize attributes
        is_active = record.get("active", True)
        if "is_enabled" in record and record["is_enabled"] is not None:
            is_active = bool(record["is_enabled"])
        record["active"] = is_active
        record["is_active"] = is_active

        if not record.get("status"):
            record["status"] = "APPROVED"

        if record.get("is_deleted") is None:
            record["is_deleted"] = False

        if not record.get("rule_number"):
            code = record.get("rule_code", "")
            digits = "".join(c for c in code if c.isdigit())
            record["rule_number"] = digits or code

        if not record.get("requirement"):
            record["requirement"] = record.get("description") or ""

        if not record.get("title"):
            record["title"] = record.get("rule_name") or ""

        if not record.get("automation_type"):
            record["automation_type"] = "AUTOMATED"

        if not record.get("legal_act"):
            record["legal_act"] = "Legal Metrology (Packaged Commodities) Rules, 2011"

        if not record.get("evidence_required"):
            record["evidence_required"] = []

        return record

    @staticmethod
    def get_rules(
        search: Optional[str] = None,
        category: Optional[str] = None,
        active: Optional[bool] = None,
        status: Optional[str] = None,
        include_deleted: bool = False,
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

        if category and category.upper() != "ALL":
            query = query.eq("category", category)

        try:
            response = query.execute()
            raw_rules = response.data or []
        except Exception as e:
            print(f"Notice: Failed to query compliance_rules: {e}")
            return []

        rules = [SupabaseService._unpack_rule(r) for r in raw_rules]

        # Filter out soft-deleted rules by default
        if not include_deleted:
            rules = [r for r in rules if not r.get("is_deleted")]

        # Filter by status if requested
        if status and status.upper() != "ALL":
            rules = [r for r in rules if str(r.get("status", "")).upper() == status.upper()]

        # Filter by search term across all pertinent statutory fields
        if search:
            s = search.lower()
            rules = [
                r for r in rules
                if s in str(r.get("rule_code", "")).lower()
                or s in str(r.get("rule_name", "")).lower()
                or s in str(r.get("rule_number", "")).lower()
                or s in str(r.get("field_name", "")).lower()
                or s in str(r.get("category", "")).lower()
                or s in str(r.get("description", "")).lower()
                or s in str(r.get("requirement", "")).lower()
                or s in str(r.get("source_document_name", "")).lower()
            ]

        return rules

    @staticmethod
    def get_rule(rule_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = (
                supabase
                .table("compliance_rules")
                .select("*")
                .eq("id", rule_id)
                .limit(1)
                .execute()
            )
            if response.data:
                return SupabaseService._unpack_rule(response.data[0])
        except Exception as e:
            print(f"Error fetching rule {rule_id}: {e}")
        return None

    @staticmethod
    def create_rule(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a compliance rule in Supabase with automatic schema adaptation.
        If extended columns are not yet in the DB table, safely packs metadata into description envelope.
        """
        data = dict(data)

        # Harmonize rule_name and title
        if not data.get("rule_name") and data.get("title"):
            data["rule_name"] = data["title"]
        if not data.get("title") and data.get("rule_name"):
            data["title"] = data["rule_name"]
        if not data.get("rule_name"):
            data["rule_name"] = data.get("rule_code") or "Untitled Rule"

        # Harmonize description and requirement
        if not data.get("description") and data.get("requirement"):
            data["description"] = data["requirement"]
        if not data.get("requirement") and data.get("description"):
            data["requirement"] = data["description"]

        # Harmonize active / is_active
        if "is_active" in data and data["is_active"] is not None and "active" not in data:
            data["active"] = bool(data["is_active"])
        elif "active" in data and data["active"] is not None and "is_active" not in data:
            data["is_active"] = bool(data["active"])
        if "active" not in data:
            data["active"] = True
            data["is_active"] = True

        all_allowed = SupabaseService.BASE_RULE_FIELDS + SupabaseService.EXTENDED_RULE_FIELDS

        # Normalize severity to pass DB check constraint (CRITICAL, HIGH, MEDIUM, LOW)
        SEVERITY_DB_MAP = {
            "CRITICAL": "CRITICAL",
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW",
            "MANDATORY": "CRITICAL",
            "WARNING": "MEDIUM",
            "OPTIONAL": "LOW",
        }
        if "severity" in data and data["severity"]:
            sev_input = str(data["severity"]).upper()
            data["severity"] = SEVERITY_DB_MAP.get(sev_input, "MEDIUM")
            if "mandatory" not in data:
                if sev_input in ("MANDATORY", "CRITICAL"):
                    data["mandatory"] = True
                elif sev_input in ("OPTIONAL", "LOW"):
                    data["mandatory"] = False

        # Ensure required DB schema constraints are met
        if not data.get("condition_type"):
            data["condition_type"] = "field_presence"
        if not data.get("field_name"):
            data["field_name"] = "declaration"

        # Validate created_by as UUID (PostgreSQL requires UUID syntax)
        if "created_by" in data:
            c_by = data["created_by"]
            if c_by:
                try:
                    uuid.UUID(str(c_by))
                except (ValueError, AttributeError, TypeError):
                    data.pop("created_by", None)
            else:
                data.pop("created_by", None)

        # Check if rule with same rule_code already exists
        rule_code = data.get("rule_code")
        existing_id = None
        if rule_code:
            try:
                exist_res = (
                    supabase
                    .table("compliance_rules")
                    .select("id")
                    .eq("rule_code", rule_code)
                    .limit(1)
                    .execute()
                )
                if exist_res.data:
                    existing_id = exist_res.data[0]["id"]
            except Exception:
                pass

        # Attempt 1: Direct insert/update with all fields
        full_payload = {k: v for k, v in data.items() if k in all_allowed and v is not None}
        try:
            if existing_id:
                upd_payload = {k: v for k, v in full_payload.items() if k != "id"}
                res = (
                    supabase
                    .table("compliance_rules")
                    .update(upd_payload)
                    .eq("id", existing_id)
                    .execute()
                )
                if res.data:
                    return SupabaseService._unpack_rule(res.data[0])
            else:
                res = (
                    supabase
                    .table("compliance_rules")
                    .insert(full_payload)
                    .execute()
                )
                if res.data:
                    return SupabaseService._unpack_rule(res.data[0])
        except Exception as ex:
            # If error is due to missing columns, gracefully fall back to base fields + envelope
            err_msg = str(ex)
            if "column" in err_msg.lower() or "PGRST204" in err_msg or "PGRST200" in err_msg:
                return SupabaseService._create_rule_with_envelope(data, existing_id)
            raise RuntimeError(f"Failed to create compliance rule: {ex}")

        raise RuntimeError("Failed to create compliance rule: empty response from database")

    @staticmethod
    def _create_rule_with_envelope(data: Dict[str, Any], existing_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fallback when extended columns do not exist in the database table.
        Packs extended attributes into description metadata envelope.
        """
        extended_meta = {
            k: data[k]
            for k in SupabaseService.EXTENDED_RULE_FIELDS
            if k in data and data[k] is not None
        }

        clean_desc = data.get("description") or data.get("requirement") or ""
        envelope_desc = f"__METRISCAN_META__:{json.dumps(extended_meta)}\n{clean_desc}"

        base_payload = {
            k: data[k]
            for k in SupabaseService.BASE_RULE_FIELDS
            if k in data and data[k] is not None
        }
        base_payload["description"] = envelope_desc

        if existing_id:
            res = (
                supabase
                .table("compliance_rules")
                .update(base_payload)
                .eq("id", existing_id)
                .execute()
            )
            return SupabaseService._unpack_rule(res.data[0]) if res.data else data
        else:
            res = (
                supabase
                .table("compliance_rules")
                .insert(base_payload)
                .execute()
            )
            return SupabaseService._unpack_rule(res.data[0]) if res.data else data

    @staticmethod
    def update_rule(rule_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates an existing compliance rule with schema adaptation.
        """
        data = dict(data)

        # Harmonize rule_name and title
        if not data.get("rule_name") and data.get("title"):
            data["rule_name"] = data["title"]
        if not data.get("title") and data.get("rule_name"):
            data["title"] = data["rule_name"]

        # Harmonize description and requirement
        if not data.get("description") and data.get("requirement"):
            data["description"] = data["requirement"]
        if not data.get("requirement") and data.get("description"):
            data["requirement"] = data["description"]

        # Harmonize active / is_active
        if "is_active" in data and data["is_active"] is not None and "active" not in data:
            data["active"] = bool(data["is_active"])
        elif "active" in data and data["active"] is not None and "is_active" not in data:
            data["is_active"] = bool(data["active"])

        all_allowed = SupabaseService.BASE_RULE_FIELDS + SupabaseService.EXTENDED_RULE_FIELDS
        payload = {k: v for k, v in data.items() if k in all_allowed}

        # Normalize severity to pass DB check constraint (CRITICAL, HIGH, MEDIUM, LOW)
        SEVERITY_DB_MAP = {
            "CRITICAL": "CRITICAL",
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW",
            "MANDATORY": "CRITICAL",
            "WARNING": "MEDIUM",
            "OPTIONAL": "LOW",
        }
        if "severity" in payload and payload["severity"]:
            sev_input = str(payload["severity"]).upper()
            payload["severity"] = SEVERITY_DB_MAP.get(sev_input, "MEDIUM")
            if "mandatory" not in payload:
                if sev_input in ("MANDATORY", "CRITICAL"):
                    payload["mandatory"] = True
                elif sev_input in ("OPTIONAL", "LOW"):
                    payload["mandatory"] = False

        # Always update updated_at
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        try:
            res = (
                supabase
                .table("compliance_rules")
                .update(payload)
                .eq("id", rule_id)
                .execute()
            )
            if res.data:
                return SupabaseService._unpack_rule(res.data[0])
        except Exception as ex:
            err_msg = str(ex)
            if "column" in err_msg.lower() or "PGRST204" in err_msg:
                # Merge into description envelope
                existing = SupabaseService.get_rule(rule_id) or {}
                merged = {**existing, **payload}
                return SupabaseService._create_rule_with_envelope(merged, existing_id=rule_id)
            raise RuntimeError(f"Failed to update compliance rule: {ex}")

        raise RuntimeError("Failed to update compliance rule: record not found")

    @staticmethod
    def approve_rule(rule_id: str, admin_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Approves a candidate draft rule, activates it, and records approval audit information.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        return SupabaseService.update_rule(
            rule_id=rule_id,
            data={
                "status": "APPROVED",
                "active": True,
                "approved_by": admin_id,
                "approved_at": now_iso,
            }
        )

    @staticmethod
    def reject_rule(rule_id: str, admin_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Rejects a draft rule. The rule is marked REJECTED and deactivated,
        ensuring it is excluded from compliance evaluations while preserving audit traceability.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        return SupabaseService.update_rule(
            rule_id=rule_id,
            data={
                "status": "REJECTED",
                "active": False,
                "approved_by": admin_id,
                "approved_at": now_iso,
            }
        )

    @staticmethod
    def delete_rule(rule_id: str, admin_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Safely deactivates and marks a rule as deleted.
        Historical inspections and reports remain unaffected; only future evaluations exclude it.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        return SupabaseService.update_rule(
            rule_id=rule_id,
            data={
                "is_deleted": True,
                "active": False,
                "status": "DELETED",
                "updated_at": now_iso,
            }
        )

    @staticmethod
    def set_rule_status(rule_id: str, active: bool) -> Dict[str, Any]:
        return SupabaseService.update_rule(rule_id, {"active": active})

    @staticmethod
    def get_active_compliance_rules() -> List[Dict[str, Any]]:
        """
        Retrieve all approved and active compliance rules currently effective for inspection scans.
        Rules with status 'DRAFT', 'REJECTED', or is_deleted=True are strictly excluded.
        """
        try:
            response = (
                supabase
                .table("compliance_rules")
                .select("*")
                .eq("active", True)
                .execute()
            )
            raw_rules = response.data or []
            unpacked = [SupabaseService._unpack_rule(r) for r in raw_rules]
            # Enforce that only APPROVED/ACTIVE and non-deleted rules participate in compliance checks
            active_approved = [
                r for r in unpacked
                if not r.get("is_deleted") and r.get("status") in ("APPROVED", "ACTIVE", None)
            ]

            def _rule_sort_key(r):
                code = str(r.get("rule_code") or r.get("rule_id") or "")
                if code.startswith("LM-") and code[3:].isdigit():
                    return (0, int(code[3:]), code)
                return (1, 0, code)

            active_approved.sort(key=_rule_sort_key)
            return active_approved
        except Exception as e:
            print(f"Warning: Failed to fetch active compliance rules from Supabase: {e}")
            return []

    @staticmethod
    def get_active_rules() -> List[Dict[str, Any]]:
        """
        Single Source of Truth method to retrieve all currently approved and active compliance rules.
        Used identically by Inspector Rules catalog, Inspector Compliance Engine, and Reports.
        """
        return SupabaseService.get_active_compliance_rules()

    # ========================================================
    # RULE DOCUMENTS PERSISTENCE
    # ========================================================

    @staticmethod
    def save_rule_document(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists an uploaded statutory rules document record.
        Falls back to audit_logs if rule_documents table is not yet created.
        """
        payload = {
            "id": data.get("id") or str(uuid.uuid4()),
            "file_name": data.get("file_name") or data.get("document_name", "rules.pdf"),
            "storage_path": data.get("storage_path", ""),
            "document_version": data.get("document_version", "1.0"),
            "extraction_status": data.get("extraction_status", "PROCESSED"),
            "uploaded_by": data.get("uploaded_by"),
            "raw_text": (data.get("raw_text") or "")[:50000],
            "rules_count": int(data.get("rules_count", 0)),
            "metadata": data.get("metadata") or {},
        }
        try:
            res = (
                supabase
                .table("rule_documents")
                .insert(payload)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception as ex:
            # Fallback: record in audit logs
            print(f"Notice: rule_documents table not found or unavailable, recording in audit_logs: {ex}")
            try:
                SupabaseService.create_audit_log(
                    user_id=data.get("uploaded_by"),
                    action="STORE_RULE_DOCUMENT",
                    entity_type="rule_document",
                    entity_id=payload["id"],
                    description=f"Statutory document {payload['file_name']} stored",
                    metadata=payload,
                )
            except Exception:
                pass
        return payload

    @staticmethod
    def get_rule_documents(limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves list of uploaded rule documents.
        """
        try:
            res = (
                supabase
                .table("rule_documents")
                .select("*")
                .order("uploaded_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception:
            return []

    # ========================================================
    # RULE SEEDING & MIGRATION MECHANISM
    # ========================================================

    @staticmethod
    def seed_initial_rules() -> Dict[str, Any]:
        """
        Safely seeds all standard 34 Legal Metrology rules (LM-01 to LM-34) from
        compliance_rules.py into Supabase if not already present.
        Preserves all IDs, legal requirements, automation types, and severities.
        """
        from app.services.compliance_rules import get_seed_records
        seed_records = get_seed_records()

        # Check existing rule codes
        existing_rules = SupabaseService.get_rules(limit=200, include_deleted=True)
        existing_codes = {r.get("rule_code") for r in existing_rules if r.get("rule_code")}

        seeded_count = 0
        skipped_count = 0
        errors = []

        for record in seed_records:
            code = record["rule_code"]
            if code in existing_codes:
                skipped_count += 1
                continue

            try:
                SupabaseService.create_rule(record)
                seeded_count += 1
                existing_codes.add(code)
            except Exception as e:
                errors.append(f"{code}: {str(e)}")

        return {
            "success": True,
            "total_baseline_rules": len(seed_records),
            "seeded_count": seeded_count,
            "skipped_existing_count": skipped_count,
            "errors": errors,
        }

    # ========================================================
    # INSPECTOR RULE REQUESTS & NOTIFICATIONS
    # ========================================================

    @staticmethod
    def create_rule_request(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new statutory rule request submitted by an inspector.
        Enforces inspector_id, generates UUID, and sets status='PENDING'.
        Persists to Supabase table 'rule_requests', with fallback to audit_logs
        and cache to guarantee zero data loss.
        """
        req_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": req_id,
            "inspector_id": data["inspector_id"],
            "rule_id": data.get("rule_id"),
            "rule_code": data.get("rule_code"),
            "request_type": data.get("request_type", "Other"),
            "subject": data.get("subject", ""),
            "description": data.get("description", ""),
            "evidence_url": data.get("evidence_url"),
            "status": "PENDING",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # Remove rule_id if None or empty
        if not payload.get("rule_id"):
            payload.pop("rule_id", None)

        SupabaseService._rule_requests_store[req_id] = dict(payload)

        try:
            res = (
                supabase
                .table("rule_requests")
                .insert(payload)
                .execute()
            )
            if res.data:
                SupabaseService._rule_requests_store[req_id] = res.data[0]
                return res.data[0]
        except Exception as ex:
            print(f"Notice: rule_requests table insertion: {ex}")
            try:
                SupabaseService.create_audit_log(
                    user_id=data["inspector_id"],
                    action="SUBMIT_RULE_REQUEST",
                    entity_type="rule_request",
                    entity_id=req_id,
                    description=f"Inspector submitted {payload['request_type']}: {payload['subject']}",
                    metadata=payload
                )
            except Exception:
                pass
        return SupabaseService._rule_requests_store[req_id]

    @staticmethod
    def _hydrate_rule_requests_from_audit_logs():
        """
        Hydrates rule requests store from persistent audit_logs table.
        Guarantees rule requests survive server restarts and cross-worker calls.
        """
        try:
            res = (
                supabase
                .table("audit_logs")
                .select("*")
                .eq("entity_type", "rule_request")
                .order("created_at", desc=False)
                .limit(200)
                .execute()
            )
            logs = res.data or []
            for log in logs:
                action = log.get("action")
                meta = log.get("metadata") or {}
                req_id = str(log.get("entity_id") or meta.get("id") or log.get("id"))
                if not req_id:
                    continue

                if action == "SUBMIT_RULE_REQUEST":
                    req_data = {
                        "id": req_id,
                        "inspector_id": log.get("user_id") or meta.get("inspector_id"),
                        "rule_id": meta.get("rule_id"),
                        "rule_code": meta.get("rule_code"),
                        "request_type": meta.get("request_type", "Other"),
                        "subject": meta.get("subject") or log.get("description", ""),
                        "description": meta.get("description", ""),
                        "evidence_url": meta.get("evidence_url"),
                        "status": meta.get("status", "PENDING"),
                        "created_at": log.get("created_at") or meta.get("created_at"),
                        "updated_at": meta.get("updated_at") or log.get("created_at"),
                    }
                    if req_id in SupabaseService._rule_requests_store:
                        for k, v in req_data.items():
                            if k not in SupabaseService._rule_requests_store[req_id]:
                                SupabaseService._rule_requests_store[req_id][k] = v
                    else:
                        SupabaseService._rule_requests_store[req_id] = req_data

                elif action == "REVIEW_RULE_REQUEST":
                    if req_id in SupabaseService._rule_requests_store:
                        SupabaseService._rule_requests_store[req_id].update({
                            "status": meta.get("status", "UNDER_REVIEW"),
                            "admin_response": meta.get("admin_response") or "",
                            "reviewed_by": log.get("user_id"),
                            "reviewed_at": log.get("created_at"),
                            "updated_at": log.get("created_at"),
                        })
                    else:
                        SupabaseService._rule_requests_store[req_id] = {
                            "id": req_id,
                            "status": meta.get("status", "UNDER_REVIEW"),
                            "admin_response": meta.get("admin_response") or "",
                            "reviewed_by": log.get("user_id"),
                            "reviewed_at": log.get("created_at"),
                            "updated_at": log.get("created_at"),
                        }
        except Exception as e:
            print(f"Notice: Failed to hydrate rule requests from audit_logs: {e}")

    @staticmethod
    def get_inspector_rule_requests(inspector_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetches all requests submitted by a specific inspector.
        """
        SupabaseService._hydrate_rule_requests_from_audit_logs()
        items: List[Dict[str, Any]] = []
        try:
            res = (
                supabase
                .table("rule_requests")
                .select("*, compliance_rules(rule_code, rule_name, title)")
                .eq("inspector_id", inspector_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            items = res.data or []
        except Exception:
            try:
                res = (
                    supabase
                    .table("rule_requests")
                    .select("*")
                    .eq("inspector_id", inspector_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                items = res.data or []
            except Exception:
                items = []

        # Merge with local/cached requests
        local_items = [
            dict(req) for req in SupabaseService._rule_requests_store.values()
            if req.get("inspector_id") == inspector_id
        ]
        merged_ids = {r.get("id") for r in items if r.get("id")}
        for li in local_items:
            if li.get("id") not in merged_ids:
                items.append(li)
                merged_ids.add(li.get("id"))

        items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        return items

    @staticmethod
    def get_admin_rule_requests(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetches all rule requests for Administrator notifications and review.
        Includes inspector profile and rule metadata where available.
        """
        SupabaseService._hydrate_rule_requests_from_audit_logs()
        items: List[Dict[str, Any]] = []
        try:
            query = (
                supabase
                .table("rule_requests")
                .select("*, profiles!rule_requests_inspector_id_fkey(id, full_name, email, role, designation), compliance_rules(id, rule_code, rule_name, title, category)")
                .order("created_at", desc=True)
                .limit(limit)
            )
            if status and status.upper() != "ALL":
                query = query.eq("status", status.upper())
            res = query.execute()
            items = res.data or []
        except Exception as ex:
            try:
                query = (
                    supabase
                    .table("rule_requests")
                    .select("*")
                    .order("created_at", desc=True)
                    .limit(limit)
                )
                if status and status.upper() != "ALL":
                    query = query.eq("status", status.upper())
                res = query.execute()
                items = res.data or []
            except Exception as e2:
                items = []

        # Merge with local/cached requests
        local_items = [dict(r) for r in SupabaseService._rule_requests_store.values()]
        if status and status.upper() != "ALL":
            local_items = [r for r in local_items if str(r.get("status", "")).upper() == status.upper()]

        merged_ids = {r.get("id") for r in items if r.get("id")}
        for li in local_items:
            if li.get("id") not in merged_ids:
                items.append(li)
                merged_ids.add(li.get("id"))

        for item in items:
            insp_id = item.get("inspector_id")
            if insp_id and not item.get("profiles"):
                try:
                    prof = SupabaseService.get_profile(insp_id)
                    if prof:
                        item["profiles"] = prof
                except Exception:
                    pass
            rid = item.get("rule_id")
            if rid and not item.get("compliance_rules"):
                try:
                    r = SupabaseService.get_rule(rid)
                    if r:
                        item["compliance_rules"] = r
                except Exception:
                    pass

        items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        return items

    @staticmethod
    def update_rule_request(
        request_id: str,
        status: str,
        admin_response: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates the review status and records admin response notes for an inspector request.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "status": status.upper(),
            "admin_response": admin_response or "",
            "reviewed_by": admin_id,
            "reviewed_at": now_iso,
            "updated_at": now_iso,
        }

        if request_id in SupabaseService._rule_requests_store:
            SupabaseService._rule_requests_store[request_id].update(payload)
        else:
            SupabaseService._rule_requests_store[request_id] = {"id": request_id, **payload}

        try:
            res = (
                supabase
                .table("rule_requests")
                .update(payload)
                .eq("id", request_id)
                .execute()
            )
            if res.data:
                SupabaseService._rule_requests_store[request_id] = res.data[0]
                try:
                    SupabaseService.create_audit_log(
                        user_id=admin_id,
                        action="REVIEW_RULE_REQUEST",
                        entity_type="rule_request",
                        entity_id=request_id,
                        description=f"Admin reviewed rule request {request_id} -> {status.upper()}",
                        metadata=payload
                    )
                except Exception:
                    pass
                return res.data[0]
        except Exception as ex:
            print(f"Notice: rule_requests table update: {ex}")
            try:
                SupabaseService.create_audit_log(
                    user_id=admin_id,
                    action="REVIEW_RULE_REQUEST",
                    entity_type="rule_request",
                    entity_id=request_id,
                    description=f"Admin reviewed rule request {request_id} -> {status.upper()}",
                    metadata=payload
                )
            except Exception:
                pass

        return SupabaseService._rule_requests_store[request_id]

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