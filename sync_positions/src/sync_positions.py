import os, time, logging
from kiteconnect import KiteConnect
import mysql.connector
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

def get_db_connection():
    return mysql.connector.connect(host=os.getenv("MYSQL_HOST","mysql"), user=os.getenv("MYSQL_USER","root"), password=os.getenv("MYSQL_PASSWORD","password"), database=os.getenv("MYSQL_DB","kiteadmin"))

def log_cron(job_name, status, message=None):
    conn=get_db_connection(); cur=conn.cursor()
    cur.execute("INSERT INTO cron_logs (job_name,status,message) VALUES (%s,%s,%s)", (job_name,status,message)); conn.commit(); cur.close(); conn.close()

def sync_positions():
    kite=KiteConnect(api_key=os.getenv("ZED_API_KEY")); kite.set_access_token(os.getenv("ZED_ACCESS_TOKEN"))
    conn=get_db_connection(); cur=conn.cursor()
    try:
        data=kite.positions()
        for pos in data["net"]:
            if pos["quantity"]<=0: continue
            cur.execute("INSERT INTO positions (zerodha_account_id,symbol,quantity,average_price,pnl) VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),average_price=VALUES(average_price),pnl=VALUES(pnl)", (int(pos["user_id"]),pos["tradingsymbol"],pos["quantity"],pos["average_price"],pos["pnl"]))
        conn.commit(); log_cron("sync_positions","success"); logging.info("sync_positions success")
    except Exception as e: log_cron("sync_positions","failure",str(e)); logging.error(f"sync_positions failed: {e}")
    finally: cur.close(); conn.close()

if __name__=="__main__":
    interval=int(os.getenv("SYNC_POSITIONS_INTERVAL",300))
    while True: sync_positions(); time.sleep(interval)