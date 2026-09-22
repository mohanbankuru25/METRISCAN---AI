import os


# =========================================================
# PADDLE CPU / LOW-MEMORY CONFIGURATION
# =========================================================

# Disable CPU optimizations that can increase memory usage.
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

# Limit CPU threads for Railway's limited resources.
os.environ["OMP_NUM_THREADS"] = "1"


from paddleocr import PaddleOCR


# =========================================================
# OCR SERVICE
# =========================================================

class OCRService:

    def __init__(self):

        # -------------------------------------------------
        # IMPORTANT:
        # Do NOT initialize PaddleOCR here.
        #
        # PaddleOCR is heavy and downloads/loads models.
        # Lazy initialization keeps startup lightweight.
        # -------------------------------------------------

        self.ocr = None

    # =====================================================
    # LAZY OCR INITIALIZATION
    # =====================================================

    def _get_ocr(self):

        # Reuse the existing OCR engine.
        if self.ocr is not None:
            return self.ocr

        print("========================================")
        print("[PADDLEOCR] Initializing OCR engine...")
        print("[PADDLEOCR] Device: CPU")
        print("[PADDLEOCR] Low-memory mode: ENABLED")
        print("========================================")

        # -------------------------------------------------
        # MEMORY-OPTIMIZED PADDLEOCR
        # -------------------------------------------------
        #
        # Disable:
        #
        # 1. Document orientation classification
        # 2. Document unwarping
        # 3. Text-line orientation classification
        #
        # These additional models consume RAM.
        #
        # The core OCR detection + recognition remains enabled.
        # -------------------------------------------------

        self.ocr = PaddleOCR(
            lang="en",
            device="cpu",
            enable_mkldnn=False,

            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )

        print("========================================")
        print("[PADDLEOCR] OCR engine ready.")
        print("========================================")

        return self.ocr

    # =====================================================
    # TEXT EXTRACTION
    # =====================================================

    def extract_text(
        self,
        image_path: str
    ):

        # -------------------------------------------------
        # Initialize OCR only when an image is analyzed.
        # -------------------------------------------------

        ocr = self._get_ocr()

        print(
            "[PADDLEOCR] Processing:",
            image_path
        )

        # -------------------------------------------------
        # RUN OCR
        # -------------------------------------------------

        result = ocr.predict(image_path)

        ocr_results = []

        # =================================================
        # PROCESS PADDLEOCR RESULT
        # =================================================

        for res in result:

            data = res.json

            # PaddleOCR can return:
            #
            # {
            #     "res": {...}
            # }
            #
            # or the result dictionary directly.

            if isinstance(data, dict):

                data = data.get(
                    "res",
                    data
                )

            if not isinstance(
                data,
                dict
            ):
                continue

            # -------------------------------------------------
            # EXTRACT TEXT
            # -------------------------------------------------

            texts = data.get(
                "rec_texts",
                []
            )

            # -------------------------------------------------
            # EXTRACT CONFIDENCE
            # -------------------------------------------------

            scores = data.get(
                "rec_scores",
                []
            )

            # -------------------------------------------------
            # EXTRACT BOUNDING BOXES
            # -------------------------------------------------

            boxes = data.get(
                "rec_boxes",
                []
            )

            # =================================================
            # PROCESS EACH DETECTED TEXT BLOCK
            # =================================================

            for i, text in enumerate(texts):

                # ---------------------------------------------
                # CONFIDENCE
                # ---------------------------------------------

                confidence = None

                if i < len(scores):

                    try:

                        confidence = float(
                            scores[i]
                        )

                    except (
                        TypeError,
                        ValueError
                    ):

                        confidence = None

                # ---------------------------------------------
                # BOUNDING BOX
                # ---------------------------------------------

                bbox = None

                if i < len(boxes):

                    current_box = boxes[i]

                    # PaddleOCR may return:
                    #
                    # - Python list
                    # - NumPy array

                    if hasattr(
                        current_box,
                        "tolist"
                    ):

                        bbox = (
                            current_box.tolist()
                        )

                    else:

                        bbox = current_box

                # ---------------------------------------------
                # TEXT NORMALIZATION
                # ---------------------------------------------

                if text is None:
                    text = ""

                text = str(text).strip()

                # ---------------------------------------------
                # STORE OCR RESULT
                # ---------------------------------------------

                ocr_results.append(
                    {
                        "text": text,
                        "confidence": confidence,
                        "bbox": bbox,
                    }
                )

        # =================================================
        # LOG RESULT
        # =================================================

        print(
            "[PADDLEOCR] OCR text blocks:",
            len(ocr_results)
        )

        return ocr_results


# =========================================================
# SINGLE SHARED OCR SERVICE INSTANCE
# =========================================================

# The service object itself is lightweight.
#
# PaddleOCR is NOT initialized here.
#
# The actual PaddleOCR engine is created only when
# extract_text() is called.

ocr_service = OCRService()
