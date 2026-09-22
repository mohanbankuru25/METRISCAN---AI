from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.ocr import router as ocr_router
from app.api.report import router as report_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.inspections import router as inspections_router
from app.api.consumer import router as consumer_router
from app.api.multi_scan import router as multi_scan_router
from app.api.inspector import router as inspector_router


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="METRISCAN Platform",
    description="AI-powered Legal Metrology Packaged Commodity Compliance Platform",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTES
# =========================================================

app.include_router(ocr_router)
app.include_router(report_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(inspections_router)
app.include_router(consumer_router)
app.include_router(multi_scan_router)
app.include_router(inspector_router)


# =========================================================
# ABSOLUTE UPLOAD DIRECTORY
# =========================================================
#
# This is important.
#
# Instead of relying on the directory from which uvicorn
# was started, always use the directory beside main.py.
#
# D:\SIH-G\backend
#       |
#       +-- main.py
#       |
#       +-- uploads
#

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads"
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# =========================================================
# STATIC IMAGE FILES
# =========================================================
#
# Backend image:
#
# uploads/example_processed.png
#
# Browser URL:
#
# http://127.0.0.1:8000/uploads/example_processed.png
#

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "SIH-G Backend is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }