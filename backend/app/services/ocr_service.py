import os


# =========================================================
# PADDLE CPU CONFIGURATION
# =========================================================

# Disable problematic CPU optimizations.
# These settings are useful for CPU-based PaddleOCR
# environments such as Hugging Face Spaces.

os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"


from paddleocr import PaddleOCR


# =========================================================
# OCR SERVICE
# =========================================================

class OCRService:

    def __init__(self):

        # IMPORTANT:
        # Do NOT initialize PaddleOCR here.
        #
        # PaddleOCR is heavy and downloads/loads several
        # models. Lazy initialization prevents the OCR
        # engine from loading simply because this module
        # was imported.

        self.ocr = None

    # =====================================================
    # LAZY OCR INITIALIZATION
    # =====================================================

    def _get_ocr(self):

        # If PaddleOCR is already initialized,
        # reuse the same instance.

        if self.ocr is not None:
            return self.ocr

        print("========================================")
        print("[PADDLEOCR] Initializing OCR engine...")
        print("[PADDLEOCR] Device: CPU")
        print("========================================")

        self.ocr = PaddleOCR(
            lang="en",
            device="cpu",
            enable_mkldnn=False,
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

        # Initialize PaddleOCR only when an actual
        # image-analysis request is received.

        ocr = self._get_ocr()

        print(
            "[PADDLEOCR] Processing:",
            image_path
        )

        result = ocr.predict(image_path)

        ocr_results = []

        # =================================================
        # PROCESS PADDLEOCR RESULT
        # =================================================

        for res in result:

            data = res.json

            # PaddleOCR may return:
            #
            # {
            #     "res": {...}
            # }
            #
            # or directly the result dictionary.

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

            texts = data.get(
                "rec_texts",
                []
            )

            scores = data.get(
                "rec_scores",
                []
            )

            boxes = data.get(
                "rec_boxes",
                []
            )

            # =================================================
            # PROCESS EACH DETECTED TEXT
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
                # TEXT
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
# The actual PaddleOCR model is created only when
# extract_text() is called.

ocr_service = OCRService()
