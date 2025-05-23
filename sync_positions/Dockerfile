FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole src folder
COPY src/ src/
CMD ["python", "src/sync_positions.py"]