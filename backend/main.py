from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
import os

from app.api.ocr import router as ocr_router


app = FastAPI(
    title="SIH-G AI Platform",
    description="AI-powered document and problem processing platform",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ocr_router)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {
        "message": "SIH-G Backend is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }