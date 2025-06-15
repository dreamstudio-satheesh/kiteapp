# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/quote")
def get_quotes():
    symbols = [key.decode().split(":", 1)[1] for key in r.scan_iter("tick:*")]
    result = {}
    for symbol in symbols:
        raw = r.get(f"tick:{symbol}")
        if raw:
            try:
                tick = json.loads(raw)
                result[symbol] = tick
            except:
                continue
    return result
