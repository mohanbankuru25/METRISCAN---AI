import io
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.multi_scan_service import MultiScanService
from app.services.auth_service import get_authenticated_user

router = APIRouter(
    prefix="/api/multi-scan",
    tags=["Multi-Scan Products"],
)


class AnalyzeSessionRequest(BaseModel):
    session_id: str
    language: Optional[str] = "en"


def _extract_inspector_id(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            user = get_authenticated_user(token)
            return str(user.id)
        except Exception:
            return None
    return None


@router.post("/upload")
async def upload_multi_scan_images(
    files: List[UploadFile] = File(...),
    authorization: Optional[str] = Header(None),
):
    """
    Upload 1 to 5 product images for a new multi-scan analysis session.
    """
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No images provided. Upload 1 to 5 images.")
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images can be analyzed at once.")

    inspector_id = _extract_inspector_id(authorization)

    try:
        session_info = MultiScanService.create_session(files=files, inspector_id=inspector_id)
        return {"success": True, "data": session_info}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize multi-scan session: {str(e)}")


@router.post("/analyze")
async def analyze_multi_scan(
    session_id: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    files: Optional[List[UploadFile]] = File(None),
    authorization: Optional[str] = Header(None),
):
    """
    Execute multi-product detection, grouping, and sequential compliance analysis.
    Supports either an existing session_id, or direct upload of 1-5 files.
    """
    inspector_id = _extract_inspector_id(authorization)

    try:
        active_session_id = session_id

        # If files were provided directly in this call, initialize session first
        if files and len(files) > 0:
            if len(files) > 5:
                raise HTTPException(status_code=400, detail="Maximum 5 images can be analyzed at once.")
            sess_info = MultiScanService.create_session(files=files, inspector_id=inspector_id)
            active_session_id = sess_info["session_id"]

        if not active_session_id:
            raise HTTPException(status_code=400, detail="Missing session_id or image files to analyze.")

        result = MultiScanService.analyze_session(
            session_id=active_session_id,
            inspector_id=inspector_id,
            language=language or "en",
        )
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-scan analysis failed: {str(e)}")


@router.get("/{session_id}")
def get_session_status(session_id: str):
    """
    Retrieve session status, detected products summary, and comparison grid.
    """
    session = MultiScanService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"success": True, "data": session}


@router.get("/{session_id}/products")
def get_session_products(session_id: str):
    """
    Retrieve all detected and analyzed unique products in the session.
    """
    session = MultiScanService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"success": True, "data": session.get("products", [])}


@router.get("/{session_id}/products/{product_id}")
def get_session_product_detail(session_id: str, product_id: str):
    """
    Retrieve full compliance and extraction details for a single product in the session.
    """
    product = MultiScanService.get_product(session_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found in session.")
    return {"success": True, "data": product}


@router.get("/{session_id}/products/{product_id}/report")
def download_product_report_pdf(session_id: str, product_id: str):
    """
    Generate and download the certified Legal Metrology Compliance Report PDF for a specific product.
    100% reuses the existing certified report generator.
    """
    try:
        pdf_bytes, filename = MultiScanService.generate_product_report_pdf(
            session_id=session_id,
            product_id=product_id,
        )
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate certified report: {str(e)}")
