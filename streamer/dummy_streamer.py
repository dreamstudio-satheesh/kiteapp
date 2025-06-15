import redis
import time
import json
import random
import os

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Define initial base prices (in rupees)
base_prices = {
    408065: {"symbol": "INFY", "price": 1580.0},
    884737: {"symbol": "TATAMOTORS", "price": 960.0},
    738561: {"symbol": "RELIANCE", "price": 2850.0},
    633601: {"symbol": "ITC", "price": 450.0},
    779521: {"symbol": "ICICIBANK", "price": 1140.0},
    134657: {"symbol": "HDFCBANK", "price": 1600.0},
    345089: {"symbol": "SBIN", "price": 845.0},
    2953217: {"symbol": "LT", "price": 3870.0},
    784129: {"symbol": "AXISBANK", "price": 1120.0},
    4268801: {"symbol": "WIPRO", "price": 510.0},
    415745: {"symbol": "HCLTECH", "price": 1440.0}
}

def simulate_price(price):
    # Simulate realistic price movement up to ±2.5%
    change_percent = random.uniform(-0.025, 0.025)
    return round(price * (1 + change_percent), 2)

def run():
    while True:
        now = int(time.time())
        for token, data in base_prices.items():
            symbol = data["symbol"]
            prev_price = data["price"]
            new_price = simulate_price(prev_price)

            # Store updated price back
            base_prices[token]["price"] = new_price

            tick = {
                "instrument_token": token,
                "ltp": new_price,
                "last_qty": random.randint(10, 100),
                "avg_price": round((prev_price + new_price) / 2, 2),
                "volume": random.randint(10000, 50000),
                "buy_qty": random.randint(500, 2000),
                "sell_qty": random.randint(500, 2000),
                "open": round(prev_price * 0.985, 2),
                "high": round(max(new_price, prev_price) * 1.005, 2),
                "low": round(min(new_price, prev_price) * 0.995, 2),
                "close": round(prev_price, 2),
                "last_trade_time": now - 2,
                "oi": random.randint(500, 2000),
                "oi_day_high": random.randint(1000, 2500),
                "oi_day_low": random.randint(100, 999),
                "exchange_time": now
            }

            r.set(f"tick:{symbol}", json.dumps(tick))
            r.publish("ticks", json.dumps({
                "symbol": symbol,
                "ltp": new_price
            }))

        time.sleep(2)

if __name__ == "__main__":
    run()
