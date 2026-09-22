import os
import gradio as gr

from main import app as fastapi_app
from app.api.ocr import process_ocr


class GradioUploadFile:

    def __init__(self, file_path):
        self.filename = os.path.basename(file_path)
        self.file_path = file_path

    async def read(self):
        with open(self.file_path, "rb") as f:
            return f.read()

    async def close(self):
        pass


async def analyze_product(image):

    if image is None:
        return {
            "status": "error",
            "message": "Please upload a food-label image."
        }

    try:
        print("========================================")
        print("Image received:", image)
        print("Starting MetriScan analysis...")
        print("========================================")

        upload_file = GradioUploadFile(image)

        result = await process_ocr(upload_file)

        print("========================================")
        print("MetriScan analysis completed.")
        print("========================================")

        return result

    except Exception as e:

        import traceback

        print("========== METRISCAN ERROR ==========")
        traceback.print_exc()
        print("=====================================")

        return {
            "status": "error",
            "message": str(e)
        }


demo = gr.Interface(
    fn=analyze_product,

    inputs=gr.Image(
        type="filepath",
        label="Upload Food Label"
    ),

    outputs=gr.JSON(
        label="MetriScan Analysis Result"
    ),

    title="MetriScan AI",

    description=(
        "AI-powered food label analysis using "
        "PaddleOCR, Gemini Vision and compliance analysis."
    )
)


app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/"
)
