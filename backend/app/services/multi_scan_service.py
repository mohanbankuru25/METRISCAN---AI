import os
import uuid
import shutil
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.ocr_service import ocr_service
from app.services.field_extraction import field_extractor
from app.services.image_preprocessing import image_preprocessor
from app.services.gemini_service import gemini_vision_service
from app.services.extraction_fusion import extraction_fusion
from app.services.ocr_field_recovery import ocr_field_recovery
from app.services.visual_compliance_analyzer import VisualComplianceAnalyzer
from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine
from app.services.report_generator import generate_compliance_pdf, generate_compliance_docx
from app.services.product_grouping_service import ProductGroupingService

try:
    from app.services.consumer_service import _RECENT_CONSUMER_SCANS
except Exception:
    _RECENT_CONSUMER_SCANS = {}

# In-memory session cache for fast lookup & fallback
_MULTI_SCAN_SESSIONS: Dict[str, Dict[str, Any]] = {}
MULTI_SCAN_UPLOAD_DIR = os.path.join("uploads", "multi_scan")
os.makedirs(MULTI_SCAN_UPLOAD_DIR, exist_ok=True)


class MultiScanService:
    """
    Multi-Scan Product Orchestration Layer.
    Coordinates 1-5 image uploads, product object grouping, deterministic identity resolution,
    sequential execution of the existing OCR/compliance pipeline, side-by-side comparison compilation,
    and report generation.
    """

    @classmethod
    def create_session(
        cls,
        files: List[Any],
        inspector_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validate and initialize a Multi-Scan session with 1 to 5 uploaded images.
        """
        if not files or len(files) == 0:
            raise ValueError("Please provide at least one product image to analyze.")

        if len(files) > 5:
            raise ValueError("Maximum 5 images can be analyzed at once.")

        session_id = f"MS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        session_folder = os.path.join(MULTI_SCAN_UPLOAD_DIR, session_id)
        os.makedirs(session_folder, exist_ok=True)

        images_list = []
        for idx, file_obj in enumerate(files):
            raw_filename = getattr(file_obj, "filename", f"image_{idx+1}.jpg")
            safe_name = f"img_{idx+1}_{os.path.basename(raw_filename)}"
            dest_path = os.path.join(session_folder, safe_name)

            # Save uploaded image file
            with open(dest_path, "wb") as buffer:
                if hasattr(file_obj, "file"):
                    shutil.copyfileobj(file_obj.file, buffer)
                elif hasattr(file_obj, "read"):
                    buffer.write(file_obj.read())

            img_id = f"IMG-{session_id}-{idx+1:02d}"
            images_list.append({
                "image_id": img_id,
                "original_filename": raw_filename,
                "filename": safe_name,
                "file_path": dest_path,
                "index": idx + 1,
            })

        session_record = {
            "id": session_id,
            "created_by": inspector_id or "user",
            "status": "PENDING",
            "total_images": len(images_list),
            "total_products": 0,
            "completed_products": 0,
            "failed_products": 0,
            "images": images_list,
            "products": [],
            "comparison_data": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Store in cache
        _MULTI_SCAN_SESSIONS[session_id] = session_record

        # Persist to Supabase if available
        try:
            supabase.table("multi_scan_sessions").insert({
                "id": session_id,
                "created_by": inspector_id,
                "status": "PENDING",
                "total_images": len(images_list),
                "total_products": 0,
                "created_at": session_record["created_at"],
            }).execute()

            for img in images_list:
                supabase.table("multi_scan_images").insert({
                    "id": img["image_id"],
                    "session_id": session_id,
                    "storage_path": img["file_path"],
                    "original_filename": img["original_filename"],
                    "image_index": img["index"],
                }).execute()
        except Exception as db_err:
            print("Notice: multi_scan_sessions db insert (using memory fallback):", db_err)

        return {
            "session_id": session_id,
            "total_images": len(images_list),
            "images": [
                {
                    "image_id": i["image_id"],
                    "filename": i["original_filename"],
                    "index": i["index"],
                }
                for i in images_list
            ],
            "status": "PENDING",
        }

    @classmethod
    def analyze_session(
        cls,
        session_id: str,
        inspector_id: Optional[str] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Execute product detection, grouping, and sequential OCR pipeline processing.
        """
        session = _MULTI_SCAN_SESSIONS.get(session_id)
        if not session:
            # Try fetching from database
            try:
                res = supabase.table("multi_scan_sessions").select("*").eq("id", session_id).execute()
                if res.data:
                    session = res.data[0]
                    # Also fetch images
                    img_res = supabase.table("multi_scan_images").select("*").eq("session_id", session_id).execute()
                    session["images"] = [
                        {
                            "image_id": r["id"],
                            "original_filename": r["original_filename"],
                            "filename": os.path.basename(r["storage_path"]),
                            "file_path": r["storage_path"],
                            "index": r.get("image_index", 1),
                        }
                        for r in (img_res.data or [])
                    ]
                    _MULTI_SCAN_SESSIONS[session_id] = session
            except Exception:
                pass

        if not session:
            raise ValueError(f"Multi-Scan session '{session_id}' not found.")

        session["status"] = "PROCESSING"

        # =========================================================
        # PHASE 1: INDIVIDUAL IMAGE OCR & IDENTITY EXTRACTION
        # =========================================================
        analyzed_images = []
        for img in session["images"]:
            file_path = img["file_path"]
            try:
                processed_path = image_preprocessor.process(file_path)
                ocr_results = ocr_service.extract_text(processed_path)
                if not isinstance(ocr_results, list):
                    ocr_results = []
            except Exception as ocr_err:
                print(f"Warning: OCR extraction failed on {file_path}: {ocr_err}")
                processed_path = file_path
                ocr_results = []

            ident_cands = ProductGroupingService.extract_identity_candidates(
                ocr_results, image_filename=img["original_filename"]
            )

            analyzed_images.append({
                "image_id": img["image_id"],
                "filename": img["original_filename"],
                "file_path": file_path,
                "processed_path": processed_path,
                "ocr_results": ocr_results,
                "identity_candidates": ident_cands,
            })

        # =========================================================
        # PHASE 2: PRODUCT GROUPING & DEDUPLICATION
        # =========================================================
        product_groups = ProductGroupingService.group_and_deduplicate(analyzed_images)

        # =========================================================
        # PHASE 3: SEQUENTIAL COMPLIANCE PIPELINE PER UNIQUE PRODUCT
        # =========================================================
        processed_products = []
        comparison_rows = []

        for idx, grp in enumerate(product_groups):
            product_id = f"{session_id}-P{idx+1:02d}"
            grp_images = grp["images"]
            primary_img = grp_images[0]

            # Merge OCR text lines from all associated images (Front + Back)
            all_ocr_results = []
            all_text_lines = []
            for im in grp_images:
                for block in im.get("ocr_results", []):
                    all_ocr_results.append(block)
                    if isinstance(block, dict) and block.get("text"):
                        all_text_lines.append(str(block["text"]).strip())

            try:
                # 1. Visual Compliance Analyzer on primary image
                visual_analysis = {}
                try:
                    visual_analyzer = VisualComplianceAnalyzer()
                    visual_analysis = visual_analyzer.analyze(
                        ocr_details=all_ocr_results,
                        image_path=primary_img["file_path"],
                    )
                except Exception as ve:
                    visual_analysis = {"engine": "visual-compliance-analyzer-v1", "error": str(ve)}

                # 2. Field Extraction from combined OCR
                paddle_data = field_extractor.extract(all_text_lines, all_ocr_results)
                if not isinstance(paddle_data, dict):
                    paddle_data = {}

                # 3. Gemini Vision on primary image
                gemini_data = None
                try:
                    gemini_data = gemini_vision_service.extract_product_data(
                        image_path=primary_img["file_path"],
                        ocr_results=all_ocr_results,
                    )
                except Exception as ge:
                    print("Gemini Vision notice in multi-scan:", ge)

                # 4. Extraction Fusion
                product_data = extraction_fusion.merge(
                    paddle_data=paddle_data,
                    gemini_data=gemini_data,
                )
                if not isinstance(product_data, dict):
                    product_data = {}

                # 5. OCR Field Recovery
                product_data = ocr_field_recovery.recover(
                    product_data=product_data,
                    ocr_results=all_ocr_results,
                )

                # Supplement identity values from grouping service if omitted by extraction
                for k, v in grp["identity"].items():
                    if v and not product_data.get(k):
                        product_data[k] = v

                # 6. Legal Metrology Applicability
                applicability_result = applicability_engine.determine(
                    product_data=product_data,
                    ocr_text=all_text_lines,
                )

                # 7. Compliance Evaluation
                compliance_result = compliance_engine.evaluate(
                    product_data=product_data,
                    applicability_result=applicability_result,
                    ocr_results=all_ocr_results,
                    visual_analysis=visual_analysis,
                )

                overall_status = compliance_result.get("overall_status", "REVIEW")
                comp_score = compliance_result.get("score") or compliance_result.get("compliance_score", 0.0)
                rules_list = compliance_result.get("results") or compliance_result.get("rules") or []
                counts = {
                    "total": len(rules_list),
                    "pass": sum(1 for r in rules_list if str(r.get("status", "")).upper() == "PASS"),
                    "fail": sum(1 for r in rules_list if str(r.get("status", "")).upper() == "FAIL"),
                    "review": sum(1 for r in rules_list if str(r.get("status", "")).upper() == "REVIEW"),
                    "not_applicable": sum(1 for r in rules_list if str(r.get("status", "")).upper() in ("NOT_APPLICABLE", "N/A")),
                    "out_of_scope": sum(1 for r in rules_list if str(r.get("status", "")).upper() == "OUT_OF_SCOPE"),
                }

                # 8. Save product record & inspection to Supabase
                inspection_id = None
                try:
                    product_record = SupabaseService.create_product({
                        "product_name": product_data.get("product_name") or grp["identity"].get("product_name") or "Packaged Commodity",
                        "category": product_data.get("category") or product_data.get("product_category") or "General",
                        "net_quantity": product_data.get("net_quantity") or product_data.get("quantity"),
                        "mrp": product_data.get("mrp"),
                        "batch_number": product_data.get("batch_number") or grp["identity"].get("batch_number"),
                        "packed_on": product_data.get("packed_on"),
                        "manufactured_on": product_data.get("manufactured_on"),
                        "best_before": product_data.get("best_before"),
                        "use_by": product_data.get("use_by"),
                        "expiry_date": product_data.get("expiry_date"),
                        "manufacturer_or_packer": product_data.get("manufacturer_or_packer"),
                        "address": product_data.get("address"),
                        "fssai_license": product_data.get("fssai_license") or grp["identity"].get("license_number"),
                        "country_of_origin": product_data.get("country_of_origin"),
                    })

                    insp_record = SupabaseService.create_inspection(
                        inspector_id=inspector_id,
                        product_id=product_record.get("id"),
                        status=overall_status,
                        compliance_score=float(comp_score),
                        counts=counts,
                    )
                    inspection_id = insp_record.get("id")

                    # Tag inspection with multi-scan metadata
                    try:
                        supabase.table("inspections").update({
                            "scan_type": "MULTI_SCAN",
                            "multi_scan_session_id": session_id,
                        }).eq("id", inspection_id).execute()
                    except Exception:
                        pass

                    # Save OCR results
                    try:
                        full_ocr_text = "\n".join(all_text_lines)
                        SupabaseService.save_ocr_result(
                            inspection_id=inspection_id,
                            full_text=full_ocr_text,
                            text_blocks=all_ocr_results,
                            confidence=0.92,
                            bbox_count=len(all_ocr_results),
                        )
                    except Exception:
                        pass

                    # Save Compliance results
                    try:
                        SupabaseService.save_compliance_result(
                            inspection_id=inspection_id,
                            compliance_score=float(comp_score),
                            overall_status=overall_status,
                            total_rules=counts["total"],
                            passed_rules=counts["pass"],
                            failed_rules=counts["fail"],
                            review_rules=counts["review"],
                            not_applicable_rules=counts["not_applicable"],
                            out_of_scope_rules=counts["out_of_scope"],
                        )
                        if rules_list:
                            SupabaseService.save_compliance_rule_results(inspection_id, rules_list)
                    except Exception:
                        pass

                except Exception as save_err:
                    print("Notice: Product Supabase save (continuing seamlessly):", save_err)

                # 8B. Save to consumer_scans for Citizen My Scans history
                try:
                    creator_id = session.get("created_by") or inspector_id or "consumer"
                    consumer_scan_id = f"CS-{uuid.uuid4().hex[:12]}"
                    consumer_record = {
                        "id": consumer_scan_id,
                        "consumer_user_id": creator_id,
                        "product_name": product_data.get("product_name") or grp["identity"].get("product_name") or "Packaged Commodity",
                        "category": product_data.get("category") or "General",
                        "brand": product_data.get("brand") or grp["identity"].get("brand") or "Not Specified",
                        "barcode": product_data.get("barcode") or grp["identity"].get("barcode"),
                        "batch_number": product_data.get("batch_number") or grp["identity"].get("batch_number"),
                        "mrp": product_data.get("mrp") or "Not Declared",
                        "net_quantity": product_data.get("net_quantity") or "Not Declared",
                        "fssai_license": product_data.get("fssai_license") or grp["identity"].get("license_number"),
                        "manufacturing_date": product_data.get("manufactured_on") or product_data.get("packed_on"),
                        "expiry_date": product_data.get("expiry_date") or product_data.get("best_before"),
                        "expiry_status": "EXPIRED" if "EXPIRED" in str(product_data.get("expiry_date", "")).upper() else "VALID",
                        "is_expired": "EXPIRED" in str(product_data.get("expiry_date", "")).upper(),
                        "legal_compliance_status": overall_status,
                        "compliance_score": comp_score,
                        "scan_type": "MULTI_SCAN",
                        "multi_scan_session_id": session_id,
                        "created_at": datetime.now().isoformat(),
                    }
                    _RECENT_CONSUMER_SCANS[consumer_scan_id] = consumer_record
                    supabase.table("consumer_scans").insert(consumer_record).execute()
                except Exception as cs_err:
                    pass

                product_summary = {
                    "product_id": product_id,
                    "group_id": grp["group_id"],
                    "display_title": f"PRODUCT {idx+1}",
                    "primary_identity": grp["primary_identity"],
                    "product_name": product_data.get("product_name") or grp["identity"].get("product_name") or "Packaged Commodity",
                    "brand": product_data.get("brand") or grp["identity"].get("brand") or "Not Specified",
                    "barcode": product_data.get("barcode") or grp["identity"].get("barcode"),
                    "license_number": product_data.get("fssai_license") or grp["identity"].get("license_number"),
                    "batch_number": product_data.get("batch_number") or grp["identity"].get("batch_number"),
                    "mrp": product_data.get("mrp") or "Not Declared",
                    "net_quantity": product_data.get("net_quantity") or "Not Declared",
                    "mfg_date": product_data.get("manufactured_on") or product_data.get("packed_on") or "Not Declared",
                    "expiry_date": product_data.get("expiry_date") or product_data.get("best_before") or "Not Declared",
                    "manufacturer": product_data.get("manufacturer_or_packer") or "Not Declared",
                    "category": product_data.get("category") or product_data.get("product_category") or "Packaged Commodity",
                    "overall_status": overall_status,
                    "compliance_score": comp_score,
                    "analysis_status": "COMPLETED",
                    "identity_confidence": grp.get("identity_confidence", 0.9),
                    "is_merged_sides": grp.get("is_merged_sides", False),
                    "match_reason": grp.get("match_reason", "initial"),
                    "images": [
                        {
                            "image_id": im["image_id"],
                            "filename": im["filename"],
                            "side": im.get("side", "full"),
                        }
                        for im in grp_images
                    ],
                    "inspection_id": inspection_id,
                    "product_data": product_data,
                    "compliance_result": compliance_result,
                    "visual_analysis": visual_analysis,
                    "ocr_details": all_ocr_results,
                }
                processed_products.append(product_summary)

            except Exception as prod_err:
                print(f"Error analyzing Product Group {grp['group_id']}: {prod_err}")
                # ERROR ISOLATION: One failed product does NOT abort the session
                failed_summary = {
                    "product_id": product_id,
                    "group_id": grp["group_id"],
                    "display_title": f"PRODUCT {idx+1}",
                    "primary_identity": grp["primary_identity"],
                    "product_name": grp["identity"].get("product_name") or "Product Error",
                    "analysis_status": "FAILED",
                    "error_message": f"Analysis encountered an issue: {str(prod_err)}",
                    "images": [
                        {
                            "image_id": im["image_id"],
                            "filename": im["filename"],
                            "side": im.get("side", "full"),
                        }
                        for im in grp_images
                    ],
                }
                processed_products.append(failed_summary)

        # Build side-by-side comparison data
        comparison_data = []
        for p in processed_products:
            comparison_data.append({
                "product_id": p["product_id"],
                "display_title": p.get("display_title"),
                "product_name": p.get("product_name"),
                "brand": p.get("brand"),
                "barcode": p.get("barcode") or "—",
                "batch_number": p.get("batch_number") or "—",
                "license_number": p.get("license_number") or "—",
                "mrp": p.get("mrp") or "—",
                "net_quantity": p.get("net_quantity") or "—",
                "mfg_date": p.get("mfg_date") or "—",
                "expiry_date": p.get("expiry_date") or "—",
                "overall_status": p.get("overall_status") or "FAILED",
                "compliance_score": p.get("compliance_score") or 0.0,
                "is_merged_sides": p.get("is_merged_sides", False),
            })

        completed_count = sum(1 for p in processed_products if p.get("analysis_status") == "COMPLETED")
        failed_count = sum(1 for p in processed_products if p.get("analysis_status") == "FAILED")

        session["status"] = "COMPLETED"
        session["total_products"] = len(processed_products)
        session["completed_products"] = completed_count
        session["failed_products"] = failed_count
        session["products"] = processed_products
        session["comparison_data"] = comparison_data
        session["updated_at"] = datetime.now().isoformat()

        # Update Supabase
        try:
            supabase.table("multi_scan_sessions").update({
                "status": "COMPLETED",
                "total_products": len(processed_products),
                "completed_products": completed_count,
                "failed_products": failed_count,
                "updated_at": session["updated_at"],
            }).eq("id", session_id).execute()

            for p in processed_products:
                supabase.table("multi_scan_products").insert({
                    "id": p["product_id"],
                    "session_id": session_id,
                    "product_identity": p.get("primary_identity"),
                    "barcode": p.get("barcode"),
                    "license_number": p.get("license_number"),
                    "batch_number": p.get("batch_number"),
                    "product_name": p.get("product_name"),
                    "brand": p.get("brand"),
                    "identity_confidence": p.get("identity_confidence", 1.0),
                    "analysis_status": p.get("analysis_status"),
                    "error_message": p.get("error_message"),
                    "inspection_id": p.get("inspection_id"),
                    "result_json": p,
                }).execute()
        except Exception as up_err:
            print("Notice: multi_scan db sync (using in-memory data):", up_err)

        return session

    @classmethod
    def get_session(cls, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a multi-scan session by ID, first checking in-memory, then Supabase.
        """
        if session_id in _MULTI_SCAN_SESSIONS:
            return _MULTI_SCAN_SESSIONS[session_id]

        # Supabase persistence fallback
        try:
            res = (
                supabase.table("multi_scan_sessions")
                .select("*")
                .eq("id", session_id)
                .limit(1)
                .execute()
            )
            if res.data:
                session_data = res.data[0]
                prod_res = (
                    supabase.table("multi_scan_products")
                    .select("*")
                    .eq("session_id", session_id)
                    .execute()
                )
                products = []
                comparison_data = []
                for pr in (prod_res.data or []):
                    p_obj = pr.get("result_json") or {
                        "product_id": pr["id"],
                        "primary_identity": pr.get("product_identity"),
                        "product_name": pr.get("product_name"),
                        "brand": pr.get("brand"),
                        "barcode": pr.get("barcode"),
                        "license_number": pr.get("license_number"),
                        "batch_number": pr.get("batch_number"),
                        "analysis_status": pr.get("analysis_status", "COMPLETED"),
                        "inspection_id": pr.get("inspection_id"),
                    }
                    products.append(p_obj)
                    comparison_data.append({
                        "product_id": p_obj.get("product_id"),
                        "display_title": p_obj.get("display_title"),
                        "product_name": p_obj.get("product_name"),
                        "brand": p_obj.get("brand"),
                        "barcode": p_obj.get("barcode") or "—",
                        "batch_number": p_obj.get("batch_number") or "—",
                        "license_number": p_obj.get("license_number") or "—",
                        "mrp": p_obj.get("mrp") or "—",
                        "net_quantity": p_obj.get("net_quantity") or "—",
                        "mfg_date": p_obj.get("mfg_date") or "—",
                        "expiry_date": p_obj.get("expiry_date") or "—",
                        "overall_status": p_obj.get("overall_status") or "FAILED",
                        "compliance_score": p_obj.get("compliance_score") or 0.0,
                        "is_merged_sides": p_obj.get("is_merged_sides", False),
                    })

                session_data["products"] = products
                session_data["comparison_data"] = comparison_data
                _MULTI_SCAN_SESSIONS[session_id] = session_data
                return session_data
        except Exception as e:
            print("Notice: get_session Supabase fallback error:", e)

        return None

    @classmethod
    def get_product(cls, session_id: str, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific analyzed product from a multi-scan session.
        """
        session = cls.get_session(session_id)
        if not session:
            return None
        for p in session.get("products", []):
            if p["product_id"] == product_id:
                return p
        return None

    @classmethod
    def generate_product_report_pdf(
        cls,
        session_id: str,
        product_id: str,
    ) -> Tuple[bytes, str]:
        """
        Reuses the existing certified Legal Metrology Compliance Report generator
        without altering the report format or template.
        """
        product = cls.get_product(session_id, product_id)
        if not product:
            raise ValueError(f"Product '{product_id}' not found in session '{session_id}'.")

        if product.get("analysis_status") != "COMPLETED":
            raise ValueError("Cannot generate compliance report for a product that failed analysis.")

        # Reconstruct exact payload structure expected by existing generate_compliance_pdf
        insp_number = f"MS-{product['product_id']}"
        filename = f"{insp_number}_Compliance_Report.pdf"

        payload = {
            "id": product.get("inspection_id") or product["product_id"],
            "inspection_id": insp_number,
            "inspection_number": insp_number,
            "filename": product["images"][0]["filename"] if product.get("images") else "product.jpg",
            "product_name": product.get("product_name") or "Packaged Commodity",
            "category": product.get("category") or "General",
            "product_data": product.get("product_data") or {},
            "ocr_details": product.get("ocr_details") or [],
            "ocr_data": {
                "text": " ".join([b.get("text", "") for b in product.get("ocr_details", []) if isinstance(b, dict)]),
                "ocr_details": product.get("ocr_details") or [],
            },
            "compliance_result": product.get("compliance_result") or {
                "overall_status": product.get("overall_status", "REVIEW"),
                "compliance_score": product.get("compliance_score", 0.0),
                "results": [],
            },
            "visual_analysis": product.get("visual_analysis") or {},
            "overall_status": product.get("overall_status", "REVIEW"),
            "compliance_score": product.get("compliance_score", 0.0),
            "inspection_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        # REUSE EXISTING CERTIFIED REPORT GENERATOR
        pdf_bytes = generate_compliance_pdf(payload)
        return pdf_bytes, filename
