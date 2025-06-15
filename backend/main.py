# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os

# --- Redis Config ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# --- FastAPI Setup ---
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to specific IP/domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Live Quote API ---
@app.get("/quote")
def get_quotes():
    result = {}
    try:
        keys = r.scan_iter("tick:*")
        for key in keys:
            symbol = key.split(":")[1]
            raw = r.get(key)
            if raw:
                tick = json.loads(raw)
                result[symbol] = tick
    except Exception as e:
        return {"error": str(e)}
    return result
