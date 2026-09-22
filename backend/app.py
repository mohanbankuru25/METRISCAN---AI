import os
import uvicorn

from main import app


# =========================================================
# METRISCAN BACKEND
# Railway / FastAPI entry point
# =========================================================

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 8000))

    print("========================================")
    print("[METRISCAN] Starting backend...")
    print("[METRISCAN] FastAPI")
    print("[METRISCAN] Port:", port)
    print("========================================")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )
