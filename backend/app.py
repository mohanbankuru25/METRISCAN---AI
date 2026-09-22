import os
import gradio as gr
import spaces

from main import app as fastapi_app
from app.api.ocr import process_ocr


# =========================================================
# GRADIO UPLOAD FILE ADAPTER
# =========================================================

class GradioUploadFile:

    def __init__(self, file_path):
        self.filename = os.path.basename(file_path)
        self.file_path = file_path

    async def read(self):
        with open(self.file_path, "rb") as f:
            return f.read()

    async def close(self):
        pass


# =========================================================
# METRISCAN ANALYSIS
# =========================================================

@spaces.GPU
async def analyze_product(image):

    if image is None:
        return {
            "status": "error",
            "message": "Please upload a food-label image."
        }

    try:

        print("========================================")
        print("[METRISCAN] Image received:", image)
        print("[METRISCAN] Starting analysis...")
        print("========================================")

        upload_file = GradioUploadFile(image)

        result = await process_ocr(upload_file)

        print("========================================")
        print("[METRISCAN] Analysis completed.")
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


# =========================================================
# GRADIO UI
# =========================================================

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


# =========================================================
# MOUNT GRADIO INTO FASTAPI
# =========================================================

app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/"
)


# =========================================================
# STARTUP
# =========================================================

if __name__ == "__main__":

    print("========================================")
    print("[METRISCAN] Starting Hugging Face app...")
    print("[METRISCAN] FastAPI + Gradio + ZeroGPU")
    print("========================================")

    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        show_error=True,
        ssr_mode=False
    )
