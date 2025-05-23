import os
from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, constr
import mysql.connector

router = APIRouter(prefix="/zerodha_accounts", tags=["Zerodha Accounts"])

class ZerodhaAccountIn(BaseModel):
    name: constr(min_length=1)
    api_key: constr(min_length=1)
    api_secret: constr(min_length=1)
    access_token: constr(min_length=1)
    status: constr(pattern="^(active|inactive)$")

class ZerodhaAccount(ZerodhaAccountIn):
    id: int

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "password"),
        database=os.getenv("MYSQL_DB", "kiteadmin"),
    )

@router.get("/", response_model=List[ZerodhaAccount])
def list_accounts():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM zerodha_accounts")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@router.get("/{account_id}", response_model=ZerodhaAccount)
def get_account(account_id: int):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM zerodha_accounts WHERE id=%s", (account_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return row

@router.post("/", response_model=ZerodhaAccount, status_code=status.HTTP_201_CREATED)
def create_account(payload: ZerodhaAccountIn):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM zerodha_accounts")
    if cur.fetchone()[0] >= 5:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Maximum of 5 accounts allowed")
    cur.execute(
        "INSERT INTO zerodha_accounts (name, api_key, api_secret, access_token, status) VALUES (%s,%s,%s,%s,%s)",
        (payload.name, payload.api_key, payload.api_secret, payload.access_token, payload.status)
    )
    conn.commit()
    account_id = cur.lastrowid
    cur.close()
    conn.close()
    return {**payload.dict(), "id": account_id}

@router.put("/{account_id}", response_model=ZerodhaAccount)
def update_account(account_id: int, payload: ZerodhaAccountIn):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM zerodha_accounts WHERE id=%s", (account_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    cur.execute(
        "UPDATE zerodha_accounts SET name=%s, api_key=%s, api_secret=%s, access_token=%s, status=%s WHERE id=%s",
        (payload.name, payload.api_key, payload.api_secret, payload.access_token, payload.status, account_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {**payload.dict(), "id": account_id}

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM zerodha_accounts WHERE id=%s", (account_id,))
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")
    conn.commit()
    cur.close()
    conn.close()
