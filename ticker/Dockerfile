FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY src/ src/

CMD ["python", "-u", "src/ticker_service.py"]
