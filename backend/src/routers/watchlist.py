import os
from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, constr
import mysql.connector

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])

class WatchlistIn(BaseModel):
    tradingsymbol: constr(min_length=1)

class WatchlistOut(BaseModel):
    id: int
    tradingsymbol: str
    instrument_token: int

def get_db():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST","mysql"),
        user=os.getenv("MYSQL_USER","root"),
        password=os.getenv("MYSQL_PASSWORD","password"),
        database=os.getenv("MYSQL_DB","kiteadmin"),
    )

@router.get("/", response_model=List[WatchlistOut])
def list_watchlist():
    conn=get_db(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT w.id, i.tradingsymbol, i.instrument_token FROM watchlist_symbols w JOIN instruments i ON w.instrument_token=i.instrument_token")
    rows=cur.fetchall()
    cur.close(); conn.close()
    return rows

@router.post("/", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
def add_watchlist(payload: WatchlistIn):
    conn=get_db(); cur=conn.cursor()
    cur.execute("SELECT instrument_token FROM instruments WHERE tradingsymbol=%s",(payload.tradingsymbol,))
    inst=cur.fetchone()
    if not inst: raise HTTPException(400, "Symbol not found")
    token=inst[0]
    try:
        cur.execute("INSERT INTO watchlist_symbols(symbol,instrument_token) VALUES(%s,%s)",(payload.tradingsymbol,token))
        conn.commit()
    except mysql.connector.IntegrityError:
        raise HTTPException(400, "Already in watchlist")
    wid=cur.lastrowid
    cur.close(); conn.close()
    return {"id":wid,"tradingsymbol":payload.tradingsymbol,"instrument_token":token}
