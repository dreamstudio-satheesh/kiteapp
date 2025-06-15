# streamer/ticker.py
import os
import redis
import json
import logging
import threading
import time
from kiteconnect import KiteTicker
from datetime import datetime

API_KEY = os.getenv("KITE_API_KEY")
ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

token_map = {
    408065: "INFY",
    884737: "TATAMOTORS",
    # Add full list of 2000 tokens here
}

def on_ticks(ws, ticks):
    for tick in ticks:
        try:
            token = tick.get("instrument_token")
            ltp = tick.get("last_price")
            symbol = token_map.get(token, str(token))

            parsed = {
                "instrument_token": token,
                "ltp": ltp,
                "timestamp": time.time()
            }

            redis_key = f"tick:{symbol}"
            r.set(redis_key, json.dumps(parsed))
            r.publish("ticks", json.dumps({"symbol": symbol, "ltp": ltp}))
        except Exception as e:
            logging.error("Tick parsing failed: %s", e)

def on_connect(ws, response):
    tokens = list(token_map.keys())
    ws.subscribe(tokens)
    ws.set_mode(ws.MODE_FULL, tokens)
    print("Subscribed to", len(tokens), "tokens")

def is_market_closed():
    now = datetime.now()
    return now.weekday() >= 5  # Simple weekend check; add holiday logic

def run():
    if is_market_closed():
        print("Market closed today. Exiting.")
        return

    kws = KiteTicker(API_KEY, ACCESS_TOKEN)
    kws.on_ticks = on_ticks
    kws.on_connect = on_connect
    kws.connect(threaded=True)
    while True:
        time.sleep(1)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()