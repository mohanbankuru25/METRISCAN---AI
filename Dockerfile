FROM python:3.10-slim

WORKDIR /app

# System dependencies required by OpenCV/PaddleOCR
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ .

# Railway provides PORT automatically
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
