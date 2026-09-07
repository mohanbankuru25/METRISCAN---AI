import os

# Disable problematic CPU optimizations on Windows
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

from paddleocr import PaddleOCR


class OCRService:

    def __init__(self):

        self.ocr = PaddleOCR(
            lang="en",
            device="cpu",
            enable_mkldnn=False,
        )

    def extract_text(self, image_path: str):

        result = self.ocr.predict(image_path)

        ocr_results = []

        for res in result:

            data = res.json

            if isinstance(data, dict):
                data = data.get("res", data)

            texts = data.get("rec_texts", [])
            scores = data.get("rec_scores", [])
            boxes = data.get("rec_boxes", [])

            for i, text in enumerate(texts):

                # -----------------------------------------
                # Confidence
                # -----------------------------------------

                confidence = None

                if i < len(scores):
                    confidence = float(scores[i])

                # -----------------------------------------
                # Bounding box
                # -----------------------------------------

                bbox = None

                if i < len(boxes):

                    current_box = boxes[i]

                    # PaddleOCR may return either:
                    # - Python list
                    # - NumPy array

                    if hasattr(current_box, "tolist"):
                        bbox = current_box.tolist()
                    else:
                        bbox = current_box

                # -----------------------------------------
                # Store OCR result
                # -----------------------------------------

                ocr_results.append(
                    {
                        "text": text,
                        "confidence": confidence,
                        "bbox": bbox,
                    }
                )

        return ocr_results


ocr_service = OCRService()