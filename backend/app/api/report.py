import io
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Header, Query, Request, Response
from fastapi.responses import StreamingResponse

from app.services.auth_service import get_authenticated_user, get_profile
from app.services.report_generator import (
    generate_compliance_docx,
    generate_compliance_pdf,
)
from app.services.supabase_service import SupabaseService, supabase

router = APIRouter(
    prefix="/api/reports",
    tags=["Report Generation & Repository"],
)


@router.get("/health")
def report_health():
    return {
        "status": "healthy",
        "service": "Legal Metrology Compliance Report Engine",
        "formats": ["pdf", "docx"],
    }


def _resolve_inspection_payload(report: Dict[str, Any]) -> Dict[str, Any]:
    insp = report.get("inspections") or (report if ("inspection_number" in report or "compliance_score" in report) else {})
    insp_id = str(insp.get("id") or report.get("inspection_id") or "")

    # Rigorous validation check: confirm report belongs strictly to requested inspection ID
    if report.get("inspection_id") and insp.get("id"):
        if str(report["inspection_id"]) != str(insp["id"]):
            raise ValueError(
                f"Cross-inspection data contamination detected: report.inspection_id ({report['inspection_id']}) != inspection.id ({insp['id']})"
            )

    prod = insp.get("products") or {}
    if isinstance(prod, list) and prod:
        prod = prod[0]
    elif not isinstance(prod, dict):
        prod = {}

    product_dict = dict(prod)
    if "category" in product_dict and not product_dict.get("product_category"):
        product_dict["product_category"] = product_dict["category"]
    if "manufactured_on" in product_dict and not product_dict.get("date_of_manufacture"):
        product_dict["date_of_manufacture"] = product_dict["manufactured_on"]
    if "consumer_care" in product_dict and not product_dict.get("consumer_contact"):
        product_dict["consumer_contact"] = product_dict["consumer_care"]

    comp_results = insp.get("compliance_results") or []
    # Verify compliance results belong to current inspection
    for cr in comp_results:
        if isinstance(cr, dict) and cr.get("inspection_id") and str(cr["inspection_id"]) != insp_id:
            raise ValueError(f"Cross-inspection compliance result detected: {cr.get('inspection_id')} != {insp_id}")

    # Recover any product fields that were detected by compliance rules but omitted in products table
    def _recover_from_evidence(rule_codes: List[str]) -> Optional[str]:
        items_to_check = []
        for cr in comp_results:
            if isinstance(cr, dict):
                items_to_check.append(cr)
                if "declaration_evaluations" in cr and isinstance(cr["declaration_evaluations"], list):
                    items_to_check.extend(cr["declaration_evaluations"])

        for cr in items_to_check:
            if not isinstance(cr, dict):
                continue
            rid = str(cr.get("rule_id", "")).upper()
            rcode = str(cr.get("rule_code", "")).upper()
            rname = str(cr.get("rule_name", "")).upper()
            if any(c.upper() in rid or c.upper() in rcode or c.upper() in rname for c in rule_codes):
                ext = cr.get("extracted")
                if ext and str(ext).strip() not in ("None", "null", "", "[]", "{}"):
                    return str(ext).strip()
                ev = cr.get("evidence")
                if ev:
                    if isinstance(ev, str):
                        try:
                            ev = json.loads(ev)
                        except Exception:
                            pass
                    if isinstance(ev, list) and ev and isinstance(ev[0], dict):
                        txt = ev[0].get("text")
                        if txt and str(txt).strip() not in ("None", "null", "", "[]", "{}"):
                            return str(txt).strip()
                    elif isinstance(ev, dict):
                        txt = ev.get("text")
                        if txt and str(txt).strip() not in ("None", "null", "", "[]", "{}"):
                            return str(txt).strip()
        return None

    if not product_dict.get("date_of_manufacture") and not product_dict.get("manufactured_on"):
        mfg_rec = _recover_from_evidence(["LM-06-05", "6(1)(d)", "MANUFACTURING / PRE-PACKING"])
        if mfg_rec:
            product_dict["date_of_manufacture"] = mfg_rec
            product_dict["manufactured_on"] = mfg_rec

    if not product_dict.get("packed_on"):
        pkd_rec = _recover_from_evidence(["PACK_DATE", "PACKED ON", "PRE-PACKING"])
        if pkd_rec and pkd_rec != product_dict.get("date_of_manufacture"):
            product_dict["packed_on"] = pkd_rec

    if not product_dict.get("best_before") and not product_dict.get("use_by"):
        exp_rec = _recover_from_evidence(["LM-06-06", "6(1)(da)", "BEST BEFORE", "USE BY"])
        if exp_rec:
            product_dict["use_by"] = exp_rec

    if not product_dict.get("mrp"):
        mrp_rec = _recover_from_evidence(["LM-06-07", "6(1)(e)", "MAXIMUM RETAIL PRICE"])
        if mrp_rec:
            product_dict["mrp"] = mrp_rec

    if not product_dict.get("net_quantity"):
        qty_rec = _recover_from_evidence(["LM-06-04", "6(1)(c)", "NET QUANTITY"])
        if qty_rec:
            product_dict["net_quantity"] = qty_rec

    if not product_dict.get("product_name"):
        pname_rec = _recover_from_evidence(["LM-06-03", "6(1)(b)", "GENERIC NAME", "PRODUCT NAME"])
        if pname_rec:
            product_dict["product_name"] = pname_rec

    if not product_dict.get("manufacturer_or_packer"):
        mfg_rec_name = _recover_from_evidence(["LM-06-01", "6(1)(a)", "MANUFACTURER / PACKER"])
        if mfg_rec_name:
            product_dict["manufacturer_or_packer"] = mfg_rec_name

    ocr_results = insp.get("ocr_results") or []
    ocr_details = []
    ocr_text = ""
    ocr_result_id = None
    if ocr_results and isinstance(ocr_results, list):
        ocr_item = ocr_results[0]
        if isinstance(ocr_item, dict):
            if ocr_item.get("inspection_id") and str(ocr_item["inspection_id"]) != insp_id:
                raise ValueError(f"Cross-inspection OCR result detected: {ocr_item.get('inspection_id')} != {insp_id}")
            ocr_result_id = ocr_item.get("id")
            ocr_text = ocr_item.get("full_text") or ""
            ocr_details = ocr_item.get("text_blocks") or ocr_item.get("raw_data") or []

    visual = insp.get("visual_analysis") or []
    visual_item = visual[0] if visual and isinstance(visual, list) else (visual if isinstance(visual, dict) else {})
    if isinstance(visual_item, dict):
        if visual_item.get("inspection_id") and str(visual_item["inspection_id"]) != insp_id:
            raise ValueError(f"Cross-inspection visual analysis detected: {visual_item.get('inspection_id')} != {insp_id}")
        if "raw_analysis" in visual_item and isinstance(visual_item["raw_analysis"], dict):
            merged_visual = dict(visual_item["raw_analysis"])
            for k, v in visual_item.items():
                if k != "raw_analysis" and k not in merged_visual:
                    merged_visual[k] = v
            visual_item = merged_visual

    evidence = insp.get("inspection_evidence") or []
    image_filename = "inspection_image.jpg"
    if evidence and isinstance(evidence, list) and isinstance(evidence[0], dict):
        sp = evidence[0].get("storage_path") or evidence[0].get("public_url") or ""
        if sp:
            image_filename = os.path.basename(sp)

    inspection_number = insp.get("inspection_number") or f"INS-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Validation logging
    print(f"[REPORT DATA VALIDATION]")
    print(f"  Current Inspection ID: {insp_id}")
    print(f"  Current Inspection Number: {inspection_number}")
    print(f"  Current Image: {image_filename}")
    print(f"  Current Product: {product_dict.get('product_name')}")
    print(f"  Current OCR Result ID: {ocr_result_id}")
    print(f"  Current Compliance Results Count: {len(comp_results)}")

    return {
        "id": insp.get("id") or insp_id,
        "inspection_id": inspection_number,
        "inspection_number": inspection_number,
        "filename": image_filename,
        "product_name": product_dict.get("product_name") or "Not Detected",
        "category": product_dict.get("product_category") or "General",
        "product_data": product_dict,
        "ocr_details": ocr_details,
        "ocr_data": {"text": ocr_text, "ocr_details": ocr_details},
        "compliance_result": {
            "overall_status": insp.get("status") or "REVIEW",
            "compliance_score": insp.get("compliance_score") or 0.0,
            "results": comp_results,
        },
        "visual_analysis": visual_item,
        "overall_status": insp.get("status") or "REVIEW",
        "compliance_score": insp.get("compliance_score") or 0.0,
        "inspection_date": insp.get("inspection_date") or str(datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
    }


def _get_or_generate_report_bytes(report: Dict[str, Any], format_type: str = "pdf", language: str = "en") -> Tuple[bytes, str, str]:
    fmt = format_type.lower()
    lang = (language or "en").lower()
    insp_number = (report.get("inspections") or {}).get("inspection_number") or report.get("report_number") or "Inspection"
    filename = f"{insp_number}_Compliance_Report_{lang}.{fmt}" if lang != "en" else f"{insp_number}_Compliance_Report.{fmt}"

    # Always generate dynamically from the scoped inspection record to prevent serving stale cached artifacts
    payload = _resolve_inspection_payload(report)
    payload["language"] = lang

    if fmt == "pdf":
        media_type = "application/pdf"
        pdf_bytes = generate_compliance_pdf(payload, language=lang)
        safe_insp = payload.get("inspection_number", "default")
        dest_path = f"{safe_insp}/compliance_report_{lang}.pdf" if lang != "en" else f"{safe_insp}/compliance_report.pdf"
        try:
            SupabaseService.upload_file(
                bucket_name="inspection-reports",
                file_path=dest_path,
                content=pdf_bytes,
                content_type="application/pdf",
            )
            if report.get("id"):
                supabase.table("reports").update({"pdf_path": f"inspection-reports/{dest_path}"}).eq("id", report["id"]).execute()
        except Exception as up_err:
            print("Notice: PDF sync to Supabase Storage warning:", up_err)

        return pdf_bytes, filename, media_type

    else:
        # DOCX format
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        docx_bytes = generate_compliance_docx(payload, language=lang)
        safe_insp = payload.get("inspection_number", "default")
        dest_path = f"{safe_insp}/compliance_report_{lang}.docx" if lang != "en" else f"{safe_insp}/compliance_report.docx"
        try:
            SupabaseService.upload_file(
                bucket_name="inspection-reports",
                file_path=dest_path,
                content=docx_bytes,
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
            if report.get("id"):
                supabase.table("reports").update({"docx_path": f"inspection-reports/{dest_path}"}).eq("id", report["id"]).execute()
        except Exception as up_err:
            print("Notice: DOCX sync to Supabase Storage warning:", up_err)

        return docx_bytes, filename, media_type


# ============================================================
# LIST REPORTS FROM SUPABASE
# ============================================================

@router.get("/")
def list_reports(
    authorization: Optional[str] = Header(None),
    inspector_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
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
        reports = SupabaseService.get_reports(
            inspector_id=scoped_inspector_id,
            search=search,
            limit=limit,
            offset=offset,
        )
        return {
            "success": True,
            "data": reports,
            "total": len(reports),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch reports from repository: {str(exc)}",
        )


# ============================================================
# GET SINGLE REPORT METADATA
# ============================================================

@router.get("/{report_id}")
def get_report_detail(
    report_id: str,
    authorization: Optional[str] = Header(None),
):
    report = SupabaseService.get_report(report_id)
    if not report:
        # Check if inspection exists without a report record
        insp = SupabaseService.get_inspection(report_id)
        if insp:
            report_num = f"REP-{insp.get('inspection_number', 'INSP').replace('INS-', '')}"
            try:
                report = SupabaseService.save_report(
                    inspection_id=insp["id"],
                    report_number=report_num,
                    pdf_path=None,
                    docx_path=None,
                    generated_by=insp.get("inspector_id"),
                )
                report["inspections"] = insp
            except Exception:
                pass

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Inspection report '{report_id}' not found in Supabase.",
        )

    return {
        "success": True,
        "data": report,
    }


# ============================================================
# VIEW / DOWNLOAD REPORT PDF
# ============================================================

@router.get("/{report_id}/pdf")
def view_or_download_pdf(
    report_id: str,
    inline: bool = Query(default=True, description="True to view in browser tab, False to force file download"),
    lang: str = Query(default="en", description="Preferred report language (en, mr, hi, te, ta, kn)"),
    authorization: Optional[str] = Header(None),
):
    report = SupabaseService.get_report(report_id)
    if not report:
        insp = SupabaseService.get_inspection(report_id)
        if insp:
            report_num = f"REP-{insp.get('inspection_number', 'INSP').replace('INS-', '')}"
            try:
                report = SupabaseService.save_report(
                    inspection_id=insp["id"],
                    report_number=report_num,
                    pdf_path=None,
                    docx_path=None,
                    generated_by=insp.get("inspector_id"),
                )
                report["inspections"] = insp
            except Exception:
                pass

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Inspection report '{report_id}' not found in Supabase.",
        )

    try:
        content, filename, media_type = _get_or_generate_report_bytes(report, "pdf", language=lang)
        disposition = "inline" if inline else "attachment"

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"',
                "Content-Type": media_type,
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate or retrieve certified PDF report: {str(exc)}",
        )


# ============================================================
# DOWNLOAD REPORT DOCX
# ============================================================

@router.get("/{report_id}/docx")
def download_docx(
    report_id: str,
    lang: str = Query(default="en", description="Preferred report language (en, mr, hi, te, ta, kn)"),
    authorization: Optional[str] = Header(None),
):
    report = SupabaseService.get_report(report_id)
    if not report:
        insp = SupabaseService.get_inspection(report_id)
        if insp:
            report_num = f"REP-{insp.get('inspection_number', 'INSP').replace('INS-', '')}"
            try:
                report = SupabaseService.save_report(
                    inspection_id=insp["id"],
                    report_number=report_num,
                    pdf_path=None,
                    docx_path=None,
                    generated_by=insp.get("inspector_id"),
                )
                report["inspections"] = insp
            except Exception:
                pass

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Inspection report '{report_id}' not found in Supabase.",
        )

    try:
        content, filename, media_type = _get_or_generate_report_bytes(report, "docx", language=lang)

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": media_type,
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate or retrieve editable DOCX report: {str(exc)}",
        )


# ============================================================
# INSPECTION ALIAS ROUTES
# ============================================================

@router.get("/inspection/{inspection_id}")
def get_report_by_inspection(
    inspection_id: str,
    authorization: Optional[str] = Header(None),
):
    return get_report_detail(report_id=inspection_id, authorization=authorization)


@router.get("/inspection/{inspection_id}/pdf")
def view_inspection_pdf(
    inspection_id: str,
    inline: bool = Query(default=True),
    lang: str = Query(default="en"),
    authorization: Optional[str] = Header(None),
):
    return view_or_download_pdf(report_id=inspection_id, inline=inline, lang=lang, authorization=authorization)


@router.get("/inspection/{inspection_id}/docx")
def download_inspection_docx(
    inspection_id: str,
    lang: str = Query(default="en"),
    authorization: Optional[str] = Header(None),
):
    return download_docx(report_id=inspection_id, lang=lang, authorization=authorization)


# ============================================================
# LEGACY DOWNLOAD ENDPOINT COMPATIBILITY
# ============================================================

@router.get("/download/{report_id}")
def download_stored_report(
    report_id: str,
    format: str = Query(default="pdf"),
    inline: bool = Query(default=False),
    lang: str = Query(default="en"),
    authorization: Optional[str] = Header(None),
):
    if format.lower() == "docx":
        return download_docx(report_id=report_id, lang=lang, authorization=authorization)
    return view_or_download_pdf(report_id=report_id, inline=inline, lang=lang, authorization=authorization)


# ============================================================
# AD-HOC GENERATION ENDPOINTS
# ============================================================

@router.post("/pdf")
async def download_pdf_report(
    payload: Dict[str, Any],
    lang: Optional[str] = Query(default=None),
):
    try:
        selected_lang = lang or payload.get("language") or "en"
        pdf_bytes = generate_compliance_pdf(payload, language=selected_lang)
        inspection_id = (
            payload.get("id")
            or payload.get("inspection_id")
            or f"LMR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        safe_id = "".join(c for c in str(inspection_id) if c.isalnum() or c in ("-", "_"))
        filename = f"Compliance_Report_{safe_id}_{selected_lang}.pdf" if selected_lang != "en" else f"Compliance_Report_{safe_id}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Content-Type": "application/pdf",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        print(f"Error generating PDF report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance PDF report: {str(e)}",
        )


@router.post("/docx")
async def download_docx_report(
    payload: Dict[str, Any],
    lang: Optional[str] = Query(default=None),
):
    try:
        selected_lang = lang or payload.get("language") or "en"
        docx_bytes = generate_compliance_docx(payload, language=selected_lang)
        inspection_id = (
            payload.get("id")
            or payload.get("inspection_id")
            or f"LMR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        safe_id = "".join(c for c in str(inspection_id) if c.isalnum() or c in ("-", "_"))
        filename = f"Compliance_Report_{safe_id}_{selected_lang}.docx" if selected_lang != "en" else f"Compliance_Report_{safe_id}.docx"

        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        print(f"Error generating DOCX report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance DOCX report: {str(e)}",
        )
