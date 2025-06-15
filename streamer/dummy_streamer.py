import redis
import time
import json
import random
import os

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def run():
    token_map = {
        408065: "INFY",
        884737: "TATAMOTORS"
    }

    while True:
        now = int(time.time())
        for token, symbol in token_map.items():
            base_price = random.randint(10000, 15000)  # in paise

            tick = {
                "instrument_token": token,
                "ltp": base_price / 100,
                "last_qty": random.randint(1, 100),
                "avg_price": (base_price - 50) / 100,
                "volume": random.randint(1000, 10000),
                "buy_qty": random.randint(100, 500),
                "sell_qty": random.randint(100, 500),
                "open": (base_price - 200) / 100,
                "high": (base_price + 100) / 100,
                "low": (base_price - 300) / 100,
                "close": (base_price - 100) / 100,
                "last_trade_time": now - 2,
                "oi": random.randint(100, 1000),
                "oi_day_high": random.randint(100, 1000),
                "oi_day_low": random.randint(100, 1000),
                "exchange_time": now
            }

            r.set(f"tick:{symbol}", json.dumps(tick))
            r.publish("ticks", json.dumps({
                "symbol": symbol,
                "ltp": tick["ltp"]
            }))

        time.sleep(2)

if __name__ == "__main__":
    run()
