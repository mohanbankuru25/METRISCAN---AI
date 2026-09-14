import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form,Query,Depends
from pydantic import BaseModel

from app.services.consumer_service import ConsumerService



router = APIRouter(
    prefix="/api/consumer",
    tags=["Consumer / Public User Portal"],
)


# ============================================================
# PYDANTIC REQUEST MODELS
# ============================================================

class ConsumerSignupRequest(BaseModel):
    full_name: str
    username: str
    email: str
    password: str
    phone: Optional[str] = None



class ConsumerLoginRequest(BaseModel):
    username: str
    password: str


class ConsumerProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


# ============================================================
# AUTHENTICATION DEPENDENCY
# ============================================================

def get_current_consumer(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid token format. Expected 'Bearer <token>'")

    token = parts[1]
    try:
        consumer = ConsumerService.get_consumer_from_token(token)
        return consumer
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@router.post("/auth/signup")
def signup(request: ConsumerSignupRequest):
    try:
        res = ConsumerService.signup_consumer(
            full_name=request.full_name,
            username=request.username,
            email=request.email,
            password=request.password,
            phone=request.phone,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/auth/login")
def login(request: ConsumerLoginRequest):
    try:
        res = ConsumerService.login_consumer(
            username=request.username,
            password=request.password,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/auth/me")
def get_me(consumer: Dict[str, Any] = Depends(get_current_consumer)):
    return {
        "user": consumer
    }


@router.put("/profile")
def update_profile(
    request: ConsumerProfileUpdateRequest,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    try:
        supabase_update = {}
        if request.full_name:
            supabase_update["full_name"] = request.full_name
        if request.phone is not None:
            supabase_update["phone"] = request.phone

        from app.services.supabase_service import supabase
        supabase.table("consumer_users").update(supabase_update).eq("id", consumer["id"]).execute()

        consumer["full_name"] = request.full_name or consumer.get("full_name")
        consumer["phone"] = request.phone if request.phone is not None else consumer.get("phone")
        return {"success": True, "user": consumer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")


# ============================================================
# PRODUCT SCANNING ENDPOINTS
# ============================================================

@router.post("/scan")
async def scan_product(
    file: UploadFile = File(...),
    location: Optional[str] = Form(None),
    barcode: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    """
    Consumer Product Safety & Information Scanner.
    Safely reuses existing OCR & compliance pipeline without duplicate heavy models.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file received")

    # Parse location JSON if provided
    loc_dict = None
    if location:
        try:
            loc_dict = json.loads(location)
        except Exception:
            pass

    try:
        scan_result = ConsumerService.process_consumer_scan(
            consumer_user_id=consumer["id"],
            image_bytes=image_bytes,
            filename=file.filename or "product_scan.jpg",
            location=loc_dict,
            barcode=barcode,
            language=language or "en",
        )
        return scan_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scanning failed: {str(e)}")


@router.get("/scans")
def list_scans(
    limit: int = 20,
    offset: int = 0,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    scans = ConsumerService.get_consumer_scans(
        consumer_user_id=consumer["id"],
        limit=limit,
        offset=offset,
    )
    return {"items": scans}


@router.get("/scans/{id}")
def get_scan(
    id: str,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    scan = ConsumerService.get_consumer_scan_detail(
        scan_id=id,
        consumer_user_id=consumer["id"],
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or access denied")
    return scan


@router.get("/scans/{id}/report/pdf")
def download_consumer_report_pdf(
    id: str,
    lang: str = Query("en", description="Language code: en, hi, mr, te"),
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    """
    Generates and streams a consumer product information report in PDF format
    in the requested language (English, Hindi, Marathi, Telugu) with native Unicode fonts.
    """
    scan = ConsumerService.get_consumer_scan_detail(
        scan_id=id,
        consumer_user_id=consumer["id"],
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found or access denied")

    from app.services.consumer_report_generator import generate_consumer_report_pdf
    from fastapi.responses import StreamingResponse
    import io

    try:
        pdf_bytes = generate_consumer_report_pdf(scan, language=lang)
        filename = f"consumer_report_{id[:8]}_{lang}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate consumer report PDF: {str(exc)}")


# ============================================================
# CONSUMER ISSUE REPORTING ENDPOINTS
# ============================================================

@router.post("/issues")
async def submit_issue(
    description: str = Form(...),
    category: Optional[str] = Form("GENERAL_COMPLAINT"),
    product_name: Optional[str] = Form("Reported Product"),
    barcode: Optional[str] = Form(None),
    lot_number: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    photo_bytes = None
    photo_filename = None
    if photo:
        photo_bytes = await photo.read()
        photo_filename = photo.filename

    audio_bytes = None
    audio_filename = None
    if audio:
        audio_bytes = await audio.read()
        audio_filename = audio.filename

    loc_dict = None
    if location:
        try:
            loc_dict = json.loads(location)
        except Exception:
            pass

    try:
        issue = ConsumerService.submit_issue(
            consumer_user_id=consumer["id"],
            category=category or "GENERAL_COMPLAINT",
            product_name=product_name or "Reported Product",
            description=description,
            photo_bytes=photo_bytes,
            photo_filename=photo_filename,
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
            barcode=barcode,
            lot_number=lot_number,
            location=loc_dict,
            language=language or "en",
        )
        return issue
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Issue submission failed: {str(e)}")


@router.get("/issues")
def list_issues(
    limit: int = 20,
    offset: int = 0,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    issues = ConsumerService.get_consumer_issues(
        consumer_user_id=consumer["id"],
        limit=limit,
        offset=offset,
    )
    return {"items": issues}


@router.get("/issues/{id}")
def get_issue(
    id: str,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    issue = ConsumerService.get_consumer_issue_detail(
        issue_id=id,
        consumer_user_id=consumer["id"],
    )
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


# ============================================================
# COMMUNITY ISSUE FEED & UPVOTES (PUBLIC / CITIZEN)
# ============================================================

@router.get("/community-feed")
def get_community_feed(
    lat: Optional[float] = Query(None, description="Citizen GPS latitude"),
    lng: Optional[float] = Query(None, description="Citizen GPS longitude"),
    radius_km: float = Query(50.0, description="Proximity radius in km"),
    limit: int = Query(30, description="Max items to retrieve"),
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    """
    Returns sanitized community issue feed near the citizen's location.
    Never returns private citizen email, phone, or identification.
    """
    try:
        feed = ConsumerService.get_community_feed(
            latitude=lat,
            longitude=lng,
            radius_km=radius_km,
            limit=limit,
        )
        return {"items": feed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch community feed: {str(e)}")


@router.post("/issues/{id}/confirm")
def confirm_community_issue(
    id: str,
    consumer: Dict[str, Any] = Depends(get_current_consumer),
):
    """
    Increments confirmation / upvote for a community issue.
    Elevates priority (1-4 -> LOW, 5-9 -> MEDIUM, 10+ -> HIGH).
    Prevents duplicate confirmations from the same user.
    """
    try:
        res = ConsumerService.confirm_community_issue(
            issue_id=id,
            consumer_user_id=consumer["id"],
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm issue: {str(e)}")

