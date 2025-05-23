# src/routers/admin_settings.py

import os
from datetime import datetime, time
from typing import Literal, Annotated
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, condecimal, Field
import mysql.connector

router = APIRouter(prefix="/admin_settings", tags=["Admin Settings"])

# constrained types
BuyPercentType      = condecimal(max_digits=5, decimal_places=2)
StoplossPercentType = condecimal(max_digits=5, decimal_places=2)
TimeStr             = Annotated[str, Field(pattern=r'^\d{2}:\d{2}:\d{2}$')]

class AdminSettings(BaseModel):
    id: int
    buy_logic: Literal["fixed_percent", "offset_ltp"]
    buy_percent: BuyPercentType
    stoploss_percent: StoplossPercentType
    auto_sell_cutoff: time

class AdminSettingsUpdate(BaseModel):
    buy_logic: Literal["fixed_percent", "offset_ltp"]
    buy_percent: BuyPercentType
    stoploss_percent: StoplossPercentType
    auto_sell_cutoff: TimeStr

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "password"),
        database=os.getenv("MYSQL_DB", "kiteadmin"),
    )

@router.get("/", response_model=AdminSettings)
def read_admin_settings():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM admin_settings WHERE id=1")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Admin settings not found")
    return row

@router.put("/", response_model=AdminSettings)
def update_admin_settings(payload: AdminSettingsUpdate):
    cutoff_time = datetime.strptime(payload.auto_sell_cutoff, "%H:%M:%S").time()
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT 1 FROM admin_settings WHERE id=1")
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Admin settings not found")
    cur.execute(
        """
        UPDATE admin_settings
           SET buy_logic=%s,
               buy_percent=%s,
               stoploss_percent=%s,
               auto_sell_cutoff=%s
         WHERE id=1
        """,
        (payload.buy_logic, payload.buy_percent, payload.stoploss_percent, cutoff_time)
    )
    conn.commit()
    cur.execute("SELECT * FROM admin_settings WHERE id=1")
    updated = cur.fetchone()
    cur.close()
    conn.close()
    return updated
