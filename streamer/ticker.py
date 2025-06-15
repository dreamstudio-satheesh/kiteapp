# streamer/ticker.py
import os
import redis
import json
import struct
import logging
import threading
from kiteconnect import KiteTicker
from datetime import datetime

API_KEY = os.getenv("KITE_API_KEY")
ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=False)

# Example token map (load dynamically in real app)
token_map = {
    408065: "INFY",
    884737: "TATAMOTORS",
    # Add all 2000 here or load from DB/file
}

def parse_quote_packet(packet: bytes) -> dict:
    fields = struct.unpack("!17i", packet[:68])
    parsed = {
        "instrument_token": fields[0],
        "ltp": fields[1] / 100,
        "last_qty": fields[2],
        "avg_price": fields[3] / 100,
        "volume": fields[4],
        "buy_qty": fields[5],
        "sell_qty": fields[6],
        "open": fields[7] / 100,
        "high": fields[8] / 100,
        "low": fields[9] / 100,
        "close": fields[10] / 100,
        "last_trade_time": datetime.fromtimestamp(fields[11]).isoformat(),
        "oi": fields[12],
        "oi_day_high": fields[13],
        "oi_day_low": fields[14],
        "exchange_time": datetime.fromtimestamp(fields[15]).isoformat(),
    }

    market_depth = []
    for i in range(10):
        offset = 64 + i * 12
        if offset + 12 > len(packet):
            break
        qty, price, orders = struct.unpack("!iiH", packet[offset:offset + 10])
        market_depth.append({
            "quantity": qty,
            "price": price / 100,
            "orders": orders,
            "side": "bid" if i < 5 else "ask"
        })

    parsed["market_depth"] = market_depth
    return parsed

def on_ticks(ws, ticks):
    for tick in ticks:
        packet = tick['data']
        parsed = parse_quote_packet(packet)
        token = parsed["instrument_token"]
        symbol = token_map.get(token, str(token))

        redis_key = f"tick:{symbol}"
        r.set(redis_key, json.dumps(parsed))
        r.publish("ticks", json.dumps({"symbol": symbol, "ltp": parsed["ltp"]}))

def on_connect(ws, response):
    tokens = list(token_map.keys())
    ws.subscribe(tokens)
    ws.set_mode(ws.MODE_FULL, tokens)
    print("Subscribed to", len(tokens), "tokens")

def run():
    kws = KiteTicker(API_KEY, ACCESS_TOKEN)
    kws.on_ticks = on_ticks
    kws.on_connect = on_connect
    kws.connect(threaded=True)
    while True:
        pass

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
