# spike/Dockerfile
FROM python:3.13-slim

WORKDIR /app

COPY watcher.py .
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "watcher.py"]
