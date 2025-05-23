import os
import json
import logging
import time
from kiteconnect import KiteTicker
import redis
import mysql.connector
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("ZED_API_KEY")
ACCESS_TOKEN = os.getenv("ZED_ACCESS_TOKEN")
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def get_watchlist_tokens():
    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "password"),
        database=os.getenv("MYSQL_DB", "kiteadmin")
    )
    cur = conn.cursor()
    cur.execute("SELECT instrument_token FROM watchlist_symbols")
    tokens = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return tokens

def on_ticks(ws, ticks):
    for t in ticks:
        token = t.get("instrument_token")
        ltp = t.get("last_price")
        if token and ltp is not None:
            redis_client.set(f"tick:{token}", json.dumps({"ltp": ltp}))
            logging.info(f"Published tick for {token}: {ltp}")

def on_connect(ws, response):
    tokens = get_watchlist_tokens()
    ws.subscribe(tokens)
    ws.set_mode(ws.MODE_FULL, tokens)
    logging.info(f"Subscribed to tokens: {tokens}")

def on_close(ws, code, reason):
    logging.warning(f"WS closed: {code} – {reason}")

def on_error(ws, code, reason):
    logging.error(f"Error: {reason}")

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    kws = KiteTicker(API_KEY, ACCESS_TOKEN)
    kws.on_ticks   = on_ticks
    kws.on_connect = on_connect
    kws.on_close   = on_close
    kws.on_error   = on_error

    # blocking connect → keeps the container running
    kws.connect()
