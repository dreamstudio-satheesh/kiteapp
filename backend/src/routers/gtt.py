import os
from fastapi import APIRouter, HTTPException
from kiteconnect import KiteConnect
import mysql.connector

router = APIRouter(prefix="/gtt", tags=["GTT Orders"])

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST","mysql"),
        user=os.getenv("MYSQL_USER","root"),
        password=os.getenv("MYSQL_PASSWORD","password"),
        database=os.getenv("MYSQL_DB","kiteadmin"),
    )

@router.get("/orders")
def fetch_gtt_orders():
    conn=get_db_connection(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT id, api_key, access_token FROM zerodha_accounts WHERE status='active'")
    accounts=cur.fetchall()
    cur.close(); conn.close()
    all_gtts=[]
    for acct in accounts:
        kite=KiteConnect(api_key=acct["api_key"])
        kite.set_access_token(acct["access_token"])
        try:
            gtts=kite.get_gtt()
            for g in gtts:
                g["_zerodha_account_id"]=acct["id"]
                all_gtts.append(g)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"GTT fetch failed for account {acct['id']}: {e}")
    return all_gtts
