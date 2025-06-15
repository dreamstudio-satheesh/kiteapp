# dummy_streamer.py
import redis
import struct
import time
import json
import random
import os

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def generate_quote_packet(token: int) -> bytes:
    now = int(time.time())
    base_price = random.randint(10000, 15000)

    fields = [
        token,
        base_price,
        random.randint(1, 100),
        base_price - 50,
        random.randint(1000, 10000),
        random.randint(100, 500),
        random.randint(100, 500),
        base_price - 200,
        base_price + 100,
        base_price - 300,
        base_price - 100,
        now - 2,
        random.randint(100, 1000),
        random.randint(100, 1000),
        random.randint(100, 1000),
        now,
        now
    ]

    packet = struct.pack("!17i", *fields)

    for i in range(10):
        qty = random.randint(1, 50)
        price = base_price + random.randint(-100, 100)
        orders = random.randint(1, 5)
        entry = struct.pack("!iiH2x", qty, price, orders)
        packet += entry

    return packet

def run():
    token_map = {
        408065: "INFY",
        884737: "TATAMOTORS"
    }

    while True:
        for token, symbol in token_map.items():
            packet = generate_quote_packet(token)
            tick = {
                "instrument_token": token,
                "last_price": struct.unpack("!i", packet[4:8])[0] / 100,
                "timestamp": time.time()
            }
            r.set(f"tick:{symbol}", json.dumps(tick))
            r.publish("ticks", json.dumps({"symbol": symbol, "ltp": tick["last_price"]}))
        time.sleep(2)

if __name__ == "__main__":
    run()
