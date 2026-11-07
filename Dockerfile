FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create necessary directories
RUN mkdir -p static/avatars data logs

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD python -m backend.scripts.prepare_database \
    && alembic upgrade head \
    && uvicorn backend.main:app --host 0.0.0.0 --port 8000
