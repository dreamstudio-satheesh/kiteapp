# dummy_streamer.py
import redis
import struct
import time
import json
import random
from datetime import datetime

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def generate_quote_packet(token: int) -> bytes:
    now = int(time.time())
    base_price = random.randint(10000, 15000)  # in paise (e.g. 150.00)

    # Quote fields (17 x int32)
    fields = [
        token,
        base_price,                   # LTP
        random.randint(1, 100),       # Last Qty
        base_price - 50,              # Avg price
        random.randint(1000, 10000),  # Volume
        random.randint(100, 500),     # Buy qty
        random.randint(100, 500),     # Sell qty
        base_price - 200,             # Open
        base_price + 100,             # High
        base_price - 300,             # Low
        base_price - 100,             # Close
        now - 2,                      # Last trade time
        random.randint(100, 1000),    # OI
        random.randint(100, 1000),    # OI High
        random.randint(100, 1000),    # OI Low
        now,                          # Exchange time
        now                           # ✅ This is the missing 17th field
    ]


    packet = struct.pack("!17i", *fields)

    # Add dummy market depth (10 entries x 12 bytes = 120 bytes)
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
                "_raw_packet": packet.hex(),  # Optional for debugging
                "timestamp": time.time()
            }
            r.set(f"tick:{symbol}", json.dumps(tick))
            r.publish("ticks", json.dumps({"symbol": symbol, "ltp": tick["last_price"]}))
        time.sleep(2)

if __name__ == "__main__":
    run()
