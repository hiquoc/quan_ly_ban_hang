FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (optimize cache)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Debug: List files to verify app.py exists (remove after fixing)
RUN ls -la /app

# Expose port (match CMD)
EXPOSE 8080

# Run with uvicorn (production-ready: no reload, 1 worker)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]