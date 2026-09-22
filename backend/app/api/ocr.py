import os
import shutil
import asyncio
from datetime import datetime
from typing import Optional, Any, Dict, List

from fastapi import APIRouter, UploadFile, File, HTTPException, Header

from app.services.ocr_service import ocr_service
from app.services.field_extraction import field_extractor
from app.services.image_preprocessing import image_preprocessor
from app.services.gemini_service import gemini_vision_service
from app.services.extraction_fusion import extraction_fusion
from app.services.ocr_field_recovery import ocr_field_recovery
from app.services.visual_compliance_analyzer import VisualComplianceAnalyzer
from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine
from app.services.supabase_service import SupabaseService
from app.services.analysis_cache_service import analysis_cache_service


router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True,
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _safe_int(value, default=0):
    """
    Safely convert a value to integer.
    """
    try:
        if value is None:
            return default

        return int(value)

    except (TypeError, ValueError):
        return default


def _safe_float(value, default=None):
    """
    Safely convert a value to float.
    """
    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


def _extract_compliance_summary(compliance_result):
    """
    Convert the existing compliance engine summary
    into a consistent dictionary for Supabase.
    """

    summary = {}

    if isinstance(
        compliance_result,
        dict,
    ):
        summary = compliance_result.get(
            "summary",
            {},
        )

    if not isinstance(
        summary,
        dict,
    ):
        summary = {}

    return {
        "total": _safe_int(
            summary.get(
                "total",
                0,
            )
        ),

        "pass": _safe_int(
            summary.get(
                "pass",
                summary.get(
                    "passed",
                    0,
                ),
            )
        ),

        "fail": _safe_int(
            summary.get(
                "fail",
                summary.get(
                    "failed",
                    0,
                ),
            )
        ),

        "review": _safe_int(
            summary.get(
                "review",
                0,
            )
        ),

        "not_applicable": _safe_int(
            summary.get(
                "not_applicable",
                summary.get(
                    "not_applicable_rules",
                    0,
                ),
            )
        ),

        "out_of_scope": _safe_int(
            summary.get(
                "out_of_scope",
                summary.get(
                    "out_of_scope_rules",
                    0,
                ),
            )
        ),
    }


def _extract_compliance_rules(compliance_result):
    """
    Extract individual compliance rules from the existing
    compliance engine result.

    Supports the current structure without changing
    compliance logic.
    """

    if not isinstance(
        compliance_result,
        dict,
    ):
        return []

    possible_keys = [
        "rules",
        "results",
        "rule_results",
        "compliance_rules",
    ]

    for key in possible_keys:

        value = compliance_result.get(
            key
        )

        if isinstance(
            value,
            list,
        ):
            return value

    return []


def _build_full_ocr_text(ocr_results):
    """
    Convert OCR blocks into one text string.
    """

    if not isinstance(
        ocr_results,
        list,
    ):
        return ""

    lines = []

    for item in ocr_results:

        if not isinstance(
            item,
            dict,
        ):
            continue

        text = item.get(
            "text",
            "",
        )

        if text:
            lines.append(
                str(text)
            )

    return "\n".join(lines)


def _extract_ocr_confidence(ocr_results):
    """
    Calculate average OCR confidence when available.
    """

    if not isinstance(
        ocr_results,
        list,
    ):
        return None

    values = []

    for item in ocr_results:

        if not isinstance(
            item,
            dict,
        ):
            continue

        possible_values = [
            item.get("confidence"),
            item.get("score"),
            item.get("confidence_score"),
        ]

        confidence = None

        for value in possible_values:

            if value is not None:

                try:
                    confidence = float(
                        value
                    )
                    break

                except (
                    TypeError,
                    ValueError,
                ):
                    pass

        if confidence is not None:
            values.append(
                confidence
            )

    if not values:
        return None

    return sum(values) / len(values)


def _extract_rule_value(rule, key, default=None):
    """
    Safely extract a value from a compliance rule.
    """

    if not isinstance(
        rule,
        dict,
    ):
        return default

    return rule.get(
        key,
        default,
    )


# ============================================================
# OCR ENDPOINT
# ============================================================

@router.post("/")
async def process_ocr(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):

    inspector_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            from app.services.auth_service import get_authenticated_user
            token = authorization.split(" ", 1)[1]
            user = get_authenticated_user(token)
            inspector_id = str(user.id)
        except Exception:
            pass

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file provided",
        )

    safe_filename = os.path.basename(
        file.filename
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        safe_filename,
    )

    try:

        # =====================================================
        # STEP 1 — SAVE INPUT IMAGE
        # =====================================================

        image_bytes = await file.read()

        with open(
            file_path,
            "wb",
        ) as buffer:

            buffer.write(image_bytes)

        # =====================================================
        # STEP 1A — DETERMINISTIC IMAGE FINGERPRINT & CACHE CHECK
        # =====================================================

        image_hash = analysis_cache_service.compute_image_hash(image_bytes)

        # Concurrency protection: await in-flight analysis if same image is currently running
        wait_event = await analysis_cache_service.acquire_in_flight_lock(image_hash)
        if wait_event is not None:
            print(f"[CONCURRENCY] Awaiting in-flight analysis for image hash: {image_hash[:12]}...")
            try:
                await asyncio.wait_for(wait_event.wait(), timeout=60.0)
            except asyncio.TimeoutError:
                pass

        cached_analysis = await analysis_cache_service.get_cached_analysis(image_hash)
        is_cache_hit = False

        if cached_analysis:
            print("\n" + "=" * 70)
            print("CACHE HIT — RETRIEVING OCR & VISION ARTIFACTS")
            print("=" * 70)
            print("Image hash:", image_hash)
            print("Recomputing compliance evaluation against live active rules from Supabase...")

            is_cache_hit = True
            extracted_text = cached_analysis.get("text", [])
            ocr_results = cached_analysis.get("ocr_details", [])
            visual_analysis = cached_analysis.get("visual_analysis", {})
            paddle_data = cached_analysis.get("paddle_data", {})
            gemini_data = cached_analysis.get("gemini_data", None)
            gemini_error = cached_analysis.get("gemini_error", None)
            product_data = cached_analysis.get("product_data", {})
            recovered_fields = cached_analysis.get("recovered_fields", [])
            applicability_result = cached_analysis.get("applicability", {})
            cached_proc_img = cached_analysis.get("processed_image")
            if cached_proc_img and os.path.exists(cached_proc_img):
                processed_path = cached_proc_img
            else:
                processed_path = file_path

            # Recompute compliance against live active rules from Supabase (Single Source of Truth)
            compliance_result = compliance_engine.evaluate(
                product_data=product_data,
                applicability_result=applicability_result,
                ocr_results=ocr_results,
                visual_analysis=visual_analysis,
            )
        else:

            print(
                "\n" + "=" * 70
            )

            print(
                "LEGAL METROLOGY PROCESSING"
            )

            print(
                "=" * 70
            )

            print(
                "Input image:",
                safe_filename,
            )

            # =====================================================
            # STEP 2 — IMAGE PREPROCESSING
            # =====================================================

            print(
                "\nSTEP 1 — IMAGE PREPROCESSING"
            )

            processed_path = (
                image_preprocessor.process(
                    file_path
                )
            )

            print(
                "Processed image:",
                processed_path,
            )

            # =====================================================
            # STEP 3 — PADDLEOCR
            # =====================================================

            print(
                "\nSTEP 2 — PADDLEOCR"
            )

            ocr_results = (
                ocr_service.extract_text(
                    processed_path
                )
            )

            if not isinstance(
                ocr_results,
                list,
            ):
                ocr_results = []

            extracted_text = [
                item.get(
                    "text",
                    "",
                )
                for item in ocr_results
                if isinstance(
                    item,
                    dict,
                )
            ]

            print(
                "OCR text blocks:",
                len(ocr_results),
            )

            # =====================================================
            # STEP 3A — VISUAL COMPLIANCE ANALYSIS
            # =====================================================

            print(
                "\nSTEP 2A — VISUAL COMPLIANCE ANALYSIS"
            )

            visual_analysis = {}

            try:

                visual_analyzer = (
                    VisualComplianceAnalyzer()
                )

                visual_analysis = (
                    visual_analyzer.analyze(
                        ocr_details=ocr_results,
                        image_path=processed_path,
                    )
                )

                print(
                    "Visual compliance analysis completed."
                )

                if isinstance(
                    visual_analysis,
                    dict,
                ):

                    print(
                        "Visual analysis keys:",
                        list(
                            visual_analysis.keys()
                        ),
                    )

                else:

                    print(
                        "WARNING: Visual analyzer "
                        "did not return a dictionary."
                    )

                    visual_analysis = {}

            except Exception as visual_exception:

                print(
                    "Visual compliance analysis error:",
                    str(visual_exception),
                )

                # Do not stop the complete OCR pipeline
                visual_analysis = {
                    "engine":
                        "visual-compliance-analyzer-v1",

                    "error":
                        str(
                            visual_exception
                        ),
                }

            # =====================================================
            # STEP 4 — FIELD EXTRACTION
            # =====================================================

            print(
                "\nSTEP 3 — FIELD EXTRACTION"
            )

            paddle_data = (
                field_extractor.extract(
                    extracted_text,
                    ocr_results,
                )
            )

            if not isinstance(
                paddle_data,
                dict,
            ):
                paddle_data = {}

            print(
                "PaddleOCR field extraction completed."
            )

            print(
                "PaddleOCR batch number:",
                paddle_data.get(
                    "batch_number"
                ),
            )

            # =====================================================
            # STEP 5 — GEMINI VISION
            # =====================================================

            print(
                "\nSTEP 4 — GEMINI VISION"
            )

            gemini_data = None
            gemini_error = None

            try:

                gemini_data = (
                    gemini_vision_service
                    .extract_product_data(
                        image_path=file_path,
                        ocr_results=ocr_results,
                    )
                )

                print(
                    "Gemini Vision extraction completed."
                )

                if isinstance(
                    gemini_data,
                    dict,
                ):

                    print(
                        "Gemini batch number:",
                        gemini_data.get(
                            "batch_number"
                        ),
                    )

            except Exception as gemini_exception:

                gemini_error = str(
                    gemini_exception
                )

                print(
                    "Gemini Vision error:",
                    gemini_error,
                )

            # =====================================================
            # STEP 6 — EXTRACTION FUSION
            # =====================================================

            print(
                "\nSTEP 5 — EXTRACTION FUSION"
            )

            product_data = (
                extraction_fusion.merge(
                    paddle_data=paddle_data,
                    gemini_data=gemini_data,
                )
            )

            if not isinstance(
                product_data,
                dict,
            ):
                product_data = {}

            print(
                "Structured product data created."
            )

            print(
                "Fused batch number:",
                product_data.get(
                    "batch_number"
                ),
            )

            # =====================================================
            # STEP 6A — OCR EVIDENCE RECOVERY
            # =====================================================

            print(
                "\nSTEP 5A — OCR EVIDENCE RECOVERY"
            )

            before_recovery = dict(
                product_data
            )

            product_data = (
                ocr_field_recovery.recover(
                    product_data=product_data,
                    ocr_results=ocr_results,
                )
            )

            if not isinstance(
                product_data,
                dict,
            ):
                product_data = before_recovery

            print(
                "Batch Number after OCR recovery:",
                product_data.get(
                    "batch_number"
                ),
            )

            recovered_fields = []

            for (
                field_name,
                recovered_value,
            ) in product_data.items():

                old_value = (
                    before_recovery.get(
                        field_name
                    )
                )

                if (
                    not old_value
                    and recovered_value
                ):

                    recovered_fields.append(
                        field_name
                    )

            if recovered_fields:

                print(
                    "Recovered fields:",
                    ", ".join(
                        recovered_fields
                    ),
                )

            else:

                print(
                    "No additional OCR fields recovered."
                )

            # =====================================================
            # STEP 7 — LEGAL METROLOGY APPLICABILITY
            # =====================================================

            print(
                "\nSTEP 6 — LEGAL METROLOGY APPLICABILITY"
            )

            applicability_result = (
                applicability_engine.determine(
                    product_data=product_data,
                    ocr_text=extracted_text,
                )
            )

            print(
                "Applicability analysis completed."
            )

            # =====================================================
            # STEP 8 — LEGAL METROLOGY COMPLIANCE
            # =====================================================

            print(
                "\nSTEP 7 — LEGAL METROLOGY COMPLIANCE"
            )

            compliance_result = (
                compliance_engine.evaluate(
                    product_data=product_data,
                    applicability_result=applicability_result,
                    ocr_results=ocr_results,
                    visual_analysis=visual_analysis,
                )
            )

            if not isinstance(
                compliance_result,
                dict,
            ):
                compliance_result = {}

            print(
                "Compliance evaluation completed."
            )

            # -------------------------------------------------
            # PERSIST SUCCESSFUL ANALYSIS TO CACHE
            # -------------------------------------------------
            if compliance_result and isinstance(compliance_result, dict):
                try:
                    cache_payload = {
                        "text": extracted_text,
                        "ocr_details": ocr_results,
                        "visual_analysis": visual_analysis,
                        "paddle_data": paddle_data,
                        "gemini_data": gemini_data,
                        "gemini_error": gemini_error,
                        "product_data": product_data,
                        "recovered_fields": recovered_fields,
                        "applicability": applicability_result,
                        "compliance": compliance_result,
                        "processed_image": processed_path,
                    }
                    product_name = (
                        product_data.get("product_name")
                        if isinstance(product_data, dict)
                        else None
                    )
                    await analysis_cache_service.set_cached_analysis(
                        image_hash=image_hash,
                        product_name=product_name,
                        analysis_data=cache_payload,
                    )
                except Exception as cache_err:
                    print(f"[CACHE WRITE NOTICE] {cache_err}")


        # =====================================================
        # FINAL RESULT LOG
        # =====================================================

        print(
            "\n" + "=" * 70
        )

        print(
            "COMPLIANCE RESULT"
        )

        print(
            "=" * 70
        )

        overall_status = (
            compliance_result.get(
                "overall_status",
                "REVIEW",
            )
        )

        summary = (
            compliance_result.get(
                "summary",
                {},
            )
        )

        compliance_score = (
            compliance_result.get(
                "score"
            )
        )

        print(
            "Overall Status:",
            overall_status,
        )

        print(
            "Summary:",
            summary,
        )

        print(
            "Compliance Score:",
            compliance_score,
        )

        print(
            "Final Batch Number:",
            product_data.get(
                "batch_number"
            ),
        )

        print(
            "=" * 70
        )

        # =====================================================
        # STEP 9 — SUPABASE DATABASE STORAGE
        # =====================================================

        print(
            "\nSTEP 8 — SUPABASE DATABASE STORAGE"
        )

        supabase_status = {
            "saved": False,
            "inspection_id": None,
            "inspection_number": None,
            "error": None,
        }

        try:

            # -------------------------------------------------
            # 9A — SAVE PRODUCT
            # -------------------------------------------------

            product_record = (
                SupabaseService.create_product(
                    {
                        "product_name":
                            product_data.get(
                                "product_name"
                            ),

                        "category":
                            product_data.get(
                                "category"
                            ) or product_data.get(
                                "product_category"
                            ),

                        "net_quantity":
                            product_data.get(
                                "net_quantity"
                            ) or product_data.get(
                                "net_weight"
                            ) or product_data.get(
                                "quantity"
                            ),

                        "mrp":
                            product_data.get(
                                "mrp"
                            ),

                        "batch_number":
                            product_data.get(
                                "batch_number"
                            ),

                        "packed_on":
                            product_data.get(
                                "packed_on"
                            ),

                        "manufactured_on":
                            product_data.get(
                                "manufactured_on"
                            ) or product_data.get(
                                "date_of_manufacture"
                            ) or product_data.get(
                                "mfg_date"
                            ),

                        "best_before":
                            product_data.get(
                                "best_before"
                            ),

                        "use_by":
                            product_data.get(
                                "use_by"
                            ),

                        "expiry_date":
                            product_data.get(
                                "expiry_date"
                            ),

                        "manufacturer_or_packer":
                            product_data.get(
                                "manufacturer_or_packer"
                            ),

                        "address":
                            product_data.get(
                                "address"
                            ),

                        "marketed_by":
                            product_data.get(
                                "marketed_by"
                            ),

                        "consumer_contact":
                            product_data.get(
                                "consumer_contact"
                            ),

                        "country_of_origin":
                            product_data.get(
                                "country_of_origin"
                            ),

                        "fssai_license":
                            product_data.get(
                                "fssai_license"
                            ),
                    }
                )
            )

            print(
                "Product saved:",
                product_record.get(
                    "id"
                ),
            )

            # -------------------------------------------------
            # 9B — COMPLIANCE SUMMARY
            # -------------------------------------------------

            compliance_counts = (
                _extract_compliance_summary(
                    compliance_result
                )
            )

            # -------------------------------------------------
            # 9C — SAVE INSPECTION
            # -------------------------------------------------

            inspection_record = (
                SupabaseService.create_inspection(
                    inspector_id=inspector_id,

                    product_id=product_record[
                        "id"
                    ],

                    status=overall_status,

                    compliance_score=(
                        _safe_float(
                            compliance_score
                        )
                    ),

                    counts=compliance_counts,
                )
            )

            inspection_id = (
                inspection_record[
                    "id"
                ]
            )

            inspection_number = (
                inspection_record[
                    "inspection_number"
                ]
            )

            print(
                "Inspection saved:",
                inspection_number,
                "Inspector:",
                inspector_id,
            )

            # -------------------------------------------------
            # 9D — SAVE OCR RESULT
            # -------------------------------------------------

            full_ocr_text = (
                _build_full_ocr_text(
                    ocr_results
                )
            )

            ocr_confidence = (
                _extract_ocr_confidence(
                    ocr_results
                )
            )

            SupabaseService.save_ocr_result(
                inspection_id=inspection_id,

                full_text=full_ocr_text,

                text_blocks=ocr_results,

                confidence=ocr_confidence,

                bbox_count=len(
                    ocr_results
                ),
            )

            print(
                "OCR result saved."
            )

            # -------------------------------------------------
            # 9E — SAVE VISUAL ANALYSIS
            # -------------------------------------------------

            if isinstance(
                visual_analysis,
                dict,
            ):

                SupabaseService.save_visual_analysis(
                    inspection_id=inspection_id,

                    visual_analysis=(
                        visual_analysis
                    ),
                )

                print(
                    "Visual analysis saved."
                )

            # -------------------------------------------------
            # 9F — SAVE COMPLIANCE RULES
            # -------------------------------------------------

            compliance_rules = (
                _extract_compliance_rules(
                    compliance_result
                )
            )

            if compliance_rules:

                SupabaseService.save_compliance_results(
                    inspection_id=inspection_id,

                    rules=compliance_rules,
                )

                print(
                    "Compliance rules saved:",
                    len(
                        compliance_rules
                    ),
                )

            else:

                print(
                    "No individual compliance "
                    "rules found to save."
                )

            # -------------------------------------------------
            # 9G — SAVE EVIDENCE TO SUPABASE STORAGE
            # -------------------------------------------------

            storage_image_url = None
            storage_path = file_path

            try:
                with open(file_path, "rb") as img_f:
                    img_bytes = img_f.read()

                storage_dest = f"{inspection_number}/original/{safe_filename}"
                storage_image_url = SupabaseService.upload_file(
                    bucket_name="inspection-images",
                    file_path=storage_dest,
                    content=img_bytes,
                    content_type="image/jpeg" if safe_filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
                )
                storage_path = f"inspection-images/{storage_dest}"
                print("Evidence image uploaded to Supabase Storage:", storage_image_url)

            except Exception as st_err:
                print("Evidence image storage upload warning:", st_err)

            try:
                SupabaseService.save_evidence(
                    inspection_id=inspection_id,
                    evidence_type="original_image",
                    storage_path=storage_path,
                    public_url=storage_image_url,
                    description="Original uploaded inspection image",
                )
                print("Original image evidence record saved.")

            except Exception as evidence_exception:
                print("Evidence record warning:", str(evidence_exception))

            # -------------------------------------------------
            # 9G2 — GENERATE & SAVE CERTIFIED REPORT TO SUPABASE STORAGE
            # -------------------------------------------------

            try:
                from app.services.report_generator import generate_compliance_pdf, generate_compliance_docx
                report_payload = {
                    "id": inspection_id,
                    "inspection_id": inspection_number,
                    "inspection_number": inspection_number,
                    "filename": safe_filename,
                    "product_name": product_data.get("product_name") or "Not Detected",
                    "category": product_data.get("product_category") or product_data.get("category") or "Not Declared",
                    "product_data": product_data,
                    "ocr_details": ocr_results,
                    "ocr_data": {"text": full_ocr_text, "ocr_details": ocr_results},
                    "compliance_result": compliance_result,
                    "visual_analysis": visual_analysis,
                    "overall_status": overall_status,
                    "compliance_score": compliance_score,
                    "inspection_date": str(datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                }

                # 1. Generate & upload PDF report
                pdf_bytes = generate_compliance_pdf(report_payload)
                pdf_dest = f"{inspection_number}/compliance_report.pdf"
                SupabaseService.upload_file(
                    bucket_name="inspection-reports",
                    file_path=pdf_dest,
                    content=pdf_bytes,
                    content_type="application/pdf"
                )

                # 2. Generate & upload DOCX report
                docx_dest = f"{inspection_number}/compliance_report.docx"
                try:
                    docx_bytes = generate_compliance_docx(report_payload)
                    SupabaseService.upload_file(
                        bucket_name="inspection-reports",
                        file_path=docx_dest,
                        content=docx_bytes,
                        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
                    docx_storage_path = f"inspection-reports/{docx_dest}"
                except Exception as docx_err:
                    print("DOCX report generation notice:", docx_err)
                    docx_storage_path = None

                report_number = f"REP-{inspection_number.replace('INS-', '')}"
                SupabaseService.save_report(
                    inspection_id=inspection_id,
                    report_number=report_number,
                    pdf_path=f"inspection-reports/{pdf_dest}",
                    docx_path=docx_storage_path,
                    generated_by=inspector_id
                )
                print("Certified PDF & DOCX reports uploaded to Supabase Storage & recorded in reports table.")
            except Exception as rep_err:
                print("Automatic report generation/storage notice:", rep_err)

            # -------------------------------------------------
            # 9H — AUDIT LOG
            # -------------------------------------------------

            try:

                SupabaseService.create_audit_log(
                    user_id=inspector_id,

                    action="CREATE_INSPECTION",

                    entity_type="inspection",

                    entity_id=inspection_id,

                    description=(
                        "Legal Metrology "
                        "product inspection "
                        "created through OCR pipeline."
                    ),

                    metadata={
                        "filename":
                            safe_filename,

                        "status":
                            overall_status,

                        "score":
                            compliance_score,

                        "inspector_id":
                            inspector_id,
                    },
                )

                print(
                    "Audit log saved."
                )

            except Exception as audit_exception:

                print(
                    "Audit log warning:",
                    str(
                        audit_exception
                    ),
                )

            supabase_status = {
                "saved": True,

                "inspection_id":
                    inspection_id,

                "inspection_number":
                    inspection_number,

                "error": None,
            }

            print(
                "Supabase database storage completed."
            )

        except Exception as supabase_exception:

            # -------------------------------------------------
            # IMPORTANT:
            # Database failure MUST NOT destroy the
            # OCR/compliance result.
            # -------------------------------------------------

            supabase_status = {
                "saved": False,

                "inspection_id": None,

                "inspection_number": None,

                "error":
                    str(
                        supabase_exception
                    ),
            }

            print(
                "\nSUPABASE STORAGE ERROR:"
            )

            print(
                str(
                    supabase_exception
                )
            )

            print(
                "WARNING: OCR/compliance result "
                "will still be returned."
            )

        # =====================================================
        # API RESPONSE
        # =====================================================

        return {

            # -------------------------------------------------
            # FILE INFORMATION
            # -------------------------------------------------

            "filename":
                safe_filename,

            "processed_image":
                processed_path,

            # -------------------------------------------------
            # RAW OCR
            # -------------------------------------------------

            "text":
                extracted_text,

            "ocr_details":
                ocr_results,

            # -------------------------------------------------
            # VISUAL COMPLIANCE ANALYSIS
            # -------------------------------------------------

            "visual_analysis":
                visual_analysis,

            # -------------------------------------------------
            # INDIVIDUAL AI SOURCES
            # -------------------------------------------------

            "paddle_data":
                paddle_data,

            "gemini_data":
                gemini_data,

            "gemini_error":
                gemini_error,

            # -------------------------------------------------
            # FINAL VALIDATED PRODUCT DATA
            # -------------------------------------------------

            "product_data":
                product_data,

            # -------------------------------------------------
            # RECOVERY INFORMATION
            # -------------------------------------------------

            "recovered_fields":
                recovered_fields,

            # -------------------------------------------------
            # LEGAL METROLOGY
            # -------------------------------------------------

            "applicability":
                applicability_result,

            "compliance":
                compliance_result,

            # -------------------------------------------------
            # SUPABASE
            # -------------------------------------------------

            "supabase":
                supabase_status,

            # -------------------------------------------------
            # CACHE STATUS
            # -------------------------------------------------

            "cached":
                is_cache_hit,
        }

    # =========================================================
    # EXCEPTION HANDLING
    # =========================================================

    except HTTPException:

        raise

    except Exception as exception:

        print(
            "\nOCR processing error:"
        )

        print(
            str(
                exception
            )
        )

        raise HTTPException(
            status_code=500,
            detail=str(
                exception
            ),
        )

    finally:

        if "image_hash" in locals():
            await analysis_cache_service.release_in_flight_lock(image_hash)