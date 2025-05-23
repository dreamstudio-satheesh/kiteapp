from fastapi import APIRouter, File, UploadFile, HTTPException
import pandas as pd
import redis
import json
import os
import mysql.connector
from typing import List
from pydantic import BaseModel

from src.routers.admin_settings import get_db_connection as get_settings_db_conn

router = APIRouter(prefix="/orders", tags=["Orders"])

class OrderResponse(BaseModel):
    id: int
    zerodha_account_id: int
    symbol: str
    qty: int
    target_percent: float
    ltp_at_upload: float
    target_price: float
    stoploss_price: float
    status: str

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST","mysql"),
        user=os.getenv("MYSQL_USER","root"),
        password=os.getenv("MYSQL_PASSWORD","password"),
        database=os.getenv("MYSQL_DB","kiteadmin"),
    )

@router.post("/upload", response_model=List[OrderResponse])
def upload_orders(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Invalid file type.")
    df = pd.read_excel(file.file)
    required_cols = {"zerodha_account_id","symbol","qty","target_percent"}
    if not required_cols.issubset(df.columns):
        raise HTTPException(status_code=400, detail=f"Excel must contain: {', '.join(required_cols)}")
    redis_client = redis.Redis(host=os.getenv("REDIS_HOST","redis"),port=int(os.getenv("REDIS_PORT",6379)),decode_responses=True)
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    settings_conn = get_settings_db_conn()
    settings_cur = settings_conn.cursor(dictionary=True)
    settings_cur.execute("SELECT stoploss_percent FROM admin_settings WHERE id=1")
    setting = settings_cur.fetchone()
    settings_cur.close()
    settings_conn.close()
    if not setting:
        raise HTTPException(status_code=500, detail="Admin settings not configured.")
    stoploss_pct = float(setting["stoploss_percent"])
    responses = []
    for _, row in df.iterrows():
        acct_id=int(row["zerodha_account_id"]); symbol=str(row["symbol"])
        qty=int(row["qty"]); target_pct=float(row["target_percent"])
        cur.execute("SELECT 1 FROM orders WHERE zerodha_account_id=%s AND symbol=%s AND status='pending'",(acct_id,symbol))
        if cur.fetchone(): continue
        cur.execute("SELECT instrument_token FROM watchlist_symbols WHERE symbol=%s",(symbol,))
        token_row=cur.fetchone()
        if not token_row: raise HTTPException(status_code=400, detail=f"{symbol} not in watchlist.")
        token=token_row["instrument_token"]
        tick_data=redis_client.get(f"tick:{token}")
        if not tick_data: raise HTTPException(status_code=502, detail=f"No live data for {symbol}.")
        ltp=float(json.loads(tick_data)["ltp"])
        target_price=round(ltp*(1-target_pct/100),2)
        stoploss_price=round(ltp*(1-stoploss_pct/100),2)
        cur.execute(
            "INSERT INTO orders (zerodha_account_id,symbol,qty,target_percent,ltp_at_upload,target_price,stoploss_price,status) VALUES (%s,%s,%s,%s,%s,%s,%s,'pending')",
            (acct_id,symbol,qty,target_pct,ltp,target_price,stoploss_price)
        )
        conn.commit()
        order_id=cur.lastrowid
        responses.append({"id":order_id,"zerodha_account_id":acct_id,"symbol":symbol,"qty":qty,"target_percent":target_pct,"ltp_at_upload":ltp,"target_price":target_price,"stoploss_price":stoploss_price,"status":"pending"})
    cur.close()
    conn.close()
    return responses
