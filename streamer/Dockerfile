# streamer/Dockerfile
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt ./
COPY ticker.py .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "ticker.py"]
# Expose the port if needed