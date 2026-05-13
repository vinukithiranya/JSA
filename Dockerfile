# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build
# Output: /frontend/dist/

# ── Stage 2: FastAPI backend + built frontend ─────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps for ReportLab PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/app ./app

# Copy built React app → FastAPI serves it as static files
COPY --from=frontend-builder /frontend/dist ./static

# Create storage dirs for PDFs, uploads, logs
RUN mkdir -p storage/reports storage/documents storage/logs

EXPOSE 8000

# PORT env var is injected by Railway/Render; default 8000 for local Docker
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
