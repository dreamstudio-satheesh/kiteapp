# spike/watcher.py
import os
import redis
import json
import time
import logging
from kiteconnect import KiteConnect
from collections import defaultdict

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
API_KEY = os.getenv("KITE_API_KEY")
ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN")

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
kite = KiteConnect(api_key=API_KEY)
kite.set_access_token(ACCESS_TOKEN)

average_prices = defaultdict(lambda: [])
triggered = set()
THRESHOLD_PERCENT = 2.0
WINDOW_SIZE = 15  # keep last 15 ticks for average

def place_order(symbol):
    try:
        instrument = kite.ltp(f"NSE:{symbol}")[f"NSE:{symbol}"]
        price = instrument['last_price']
        print(f"BUY {symbol} @ {price}")
        order = kite.place_order(
            variety=kite.VARIETY_REGULAR,
            exchange=kite.EXCHANGE_NSE,
            tradingsymbol=symbol,
            transaction_type=kite.TRANSACTION_TYPE_BUY,
            quantity=1,
            order_type=kite.ORDER_TYPE_MARKET,
            product=kite.PRODUCT_MIS
        )
        print("Order placed:", order)
        triggered.add(symbol)
    except Exception as e:
        logging.error(f"Order failed for {symbol}: {e}")

def handle_tick(message):
    try:
        payload = json.loads(message["data"])
        symbol = payload["symbol"]
        ltp = float(payload["ltp"])

        history = average_prices[symbol]
        history.append(ltp)
        if len(history) > WINDOW_SIZE:
            history.pop(0)

        avg = sum(history) / len(history)
        spike_percent = ((ltp - avg) / avg) * 100

        if spike_percent >= THRESHOLD_PERCENT and symbol not in triggered:
            logging.info(f"Spike detected: {symbol} {spike_percent:.2f}%")
            place_order(symbol)

    except Exception as e:
        logging.error("Tick handling error: %s", e)

def run():
    pubsub = r.pubsub()
    pubsub.subscribe("ticks")
    print("Watching ticks...")
    for message in pubsub.listen():
        if message["type"] == "message":
            handle_tick(message)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
