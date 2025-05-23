import os
import time
import json
import logging
from datetime import datetime
import redis
import mysql.connector
from kiteconnect import KiteConnect
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "password"),
        database=os.getenv("MYSQL_DB", "kiteadmin")
    )

def monitor_orders():
    interval = int(os.getenv("ORDER_MONITOR_INTERVAL", 5))
    while True:
        try:
            redis_client.ping()
        except:
            logging.error("Redis unavailable, stopping.")
            break

        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        now = datetime.now().time()
        cur.execute("SELECT auto_sell_cutoff FROM admin_settings WHERE id = 1")
        cutoff_row = cur.fetchone()
        if cutoff_row and cutoff_row.get("auto_sell_cutoff"):
            cutoff_time = datetime.strptime(
                str(cutoff_row["auto_sell_cutoff"]),
                "%H:%M:%S"
            ).time()
        else:
            cutoff_time = now

        # BUY logic omitted for brevity; assume in place

        if now >= cutoff_time:
            kite = KiteConnect(api_key=os.getenv("ZED_API_KEY"))
            kite.set_access_token(os.getenv("ZED_ACCESS_TOKEN"))
            positions = kite.positions()["net"]

            for pos in positions:
                qty = pos["quantity"]
                sym = pos["tradingsymbol"]
                if qty > 0:
                    try:
                        resp = kite.place_order(
                            variety="regular",
                            exchange="NSE",
                            tradingsymbol=sym,
                            transaction_type="SELL",
                            quantity=qty,
                            product="MIS",
                            order_type="MARKET"
                        )
                        cur.execute(
                            """
                            INSERT INTO order_logs
                                (order_id, type, product, notes, timestamp)
                            VALUES
                                (NULL, 'AUTO_SELL', 'MIS', %s, %s)
                            """,
                            (json.dumps(resp), datetime.now())
                        )
                        conn.commit()
                        logging.info(f"AUTOSELL {sym} qty {qty}")
                    except Exception as e:
                        cur.execute(
                            """
                            INSERT INTO order_logs
                                (order_id, type, product, notes, timestamp)
                            VALUES
                                (NULL, 'AUTO_SELL_FAILED', 'MIS', %s, %s)
                            """,
                            (str(e), datetime.now())
                        )
                        conn.commit()

        cur.close()
        conn.close()
        time.sleep(interval)

if __name__ == "__main__":
    monitor_orders()
