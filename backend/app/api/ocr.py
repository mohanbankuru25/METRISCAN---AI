import os
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.ocr_service import ocr_service
from app.services.field_extraction import field_extractor
from app.services.image_preprocessing import image_preprocessor
from app.services.gemini_service import gemini_vision_service
from app.services.extraction_fusion import extraction_fusion
from app.services.ocr_field_recovery import ocr_field_recovery

from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine


router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True,
)


@router.post("/")
async def process_ocr(
    file: UploadFile = File(...)
):
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
        # SAVE INPUT IMAGE
        # =====================================================

        with open(
            file_path,
            "wb",
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

        print("\n" + "=" * 70)
        print("LEGAL METROLOGY PROCESSING")
        print("=" * 70)

        print(
            f"Input image: {safe_filename}"
        )

        # =====================================================
        # STEP 1 — IMAGE PREPROCESSING
        # =====================================================

        print("\nSTEP 1 — IMAGE PREPROCESSING")

        processed_path = image_preprocessor.process(
            file_path
        )

        print(
            f"Processed image: {processed_path}"
        )

        # =====================================================
        # STEP 2 — PADDLEOCR
        # =====================================================

        print("\nSTEP 2 — PADDLEOCR")

        ocr_results = ocr_service.extract_text(
            processed_path
        )

        extracted_text = [
            item["text"]
            for item in ocr_results
        ]

        print(
            f"OCR text blocks: {len(ocr_results)}"
        )

        # =====================================================
        # STEP 3 — FIELD EXTRACTION
        # =====================================================

        print("\nSTEP 3 — FIELD EXTRACTION")

        paddle_data = field_extractor.extract(
            extracted_text,
            ocr_results,
        )

        print(
            "PaddleOCR field extraction completed."
        )

        # =====================================================
        # STEP 4 — GEMINI VISION
        # =====================================================

        print("\nSTEP 4 — GEMINI VISION")

        gemini_data = None
        gemini_error = None

        try:

            gemini_data = (
                gemini_vision_service.extract_product_data(
                    image_path=file_path,
                    ocr_results=ocr_results,
                )
            )

            print(
                "Gemini Vision extraction completed."
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
        # STEP 5 — EXTRACTION FUSION
        # =====================================================

        print("\nSTEP 5 — EXTRACTION FUSION")

        product_data = extraction_fusion.merge(
            paddle_data=paddle_data,
            gemini_data=gemini_data,
        )

        print(
            "Structured product data created."
        )

        # =====================================================
        # STEP 5A — OCR EVIDENCE RECOVERY
        # =====================================================
        #
        # Important:
        # The raw PaddleOCR output can contain correct values even
        # when the field extractor does not map them to a field.
        #
        # This recovery layer fills ONLY missing fields.
        # It does not overwrite reliable extracted values.
        #
        # This is especially useful for:
        #   MRP
        #   batch
        #   MFD
        #   use-by
        #   license
        #   manufacturer
        #   address
        #   consumer contact
        #   net quantity
        #
        # =====================================================

        print(
            "\nSTEP 5A — OCR EVIDENCE RECOVERY"
        )

        before_recovery = dict(
            product_data
        )

        product_data = ocr_field_recovery.recover(
            product_data=product_data,
            ocr_results=ocr_results,
        )

        recovered_fields = []

        for field_name, recovered_value in product_data.items():

            old_value = before_recovery.get(
                field_name
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
                ", ".join(recovered_fields),
            )

        else:

            print(
                "No additional OCR fields recovered."
            )

        # =====================================================
        # STEP 6 — LEGAL METROLOGY APPLICABILITY
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
        # STEP 7 — LEGAL METROLOGY COMPLIANCE
        # =====================================================

        print(
            "\nSTEP 7 — LEGAL METROLOGY COMPLIANCE"
        )

        compliance_result = (
            compliance_engine.evaluate(
                product_data=product_data,
                applicability_result=applicability_result,
                ocr_results=ocr_results,
            )
        )

        print(
            "Compliance evaluation completed."
        )

        # =====================================================
        # RESULT
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

        print(
            "Overall Status:",
            compliance_result.get(
                "overall_status"
            ),
        )

        print(
            "Summary:",
            compliance_result.get(
                "summary"
            ),
        )

        print(
            "Compliance Score:",
            compliance_result.get(
                "score"
            ),
        )

        print(
            "=" * 70
        )

        return {
            "filename": safe_filename,

            "processed_image": processed_path,

            # Raw OCR
            "text": extracted_text,
            "ocr_details": ocr_results,

            # Individual AI sources
            "paddle_data": paddle_data,
            "gemini_data": gemini_data,
            "gemini_error": gemini_error,

            # Final validated product data
            "product_data": product_data,

            # Additional debug information
            "recovered_fields": recovered_fields,

            # Legal Metrology
            "applicability": applicability_result,
            "compliance": compliance_result,
        }

    except HTTPException:
        raise

    except Exception as exception:

        print(
            "OCR processing error:",
            str(exception),
        )

        raise HTTPException(
            status_code=500,
            detail=str(exception),
        )
