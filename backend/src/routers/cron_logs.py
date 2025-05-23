import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import mysql.connector

router = APIRouter(prefix="/cron_logs", tags=["Cron Logs"])

class CronLog(BaseModel):
    id: int
    job_name: str
    status: str
    message: Optional[str]
    ran_at: str

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST","mysql"),
        user=os.getenv("MYSQL_USER","root"),
        password=os.getenv("MYSQL_PASSWORD","password"),
        database=os.getenv("MYSQL_DB","kiteadmin"),
    )

@router.get("/", response_model=List[CronLog])
def list_cron_logs(job_name: Optional[str]=Query(None), status: Optional[str]=Query(None), limit: int=Query(100, ge=1), offset: int=Query(0, ge=0)):
    conn=get_db_connection(); cur=conn.cursor(dictionary=True)
    query="SELECT * FROM cron_logs"; filters=[]; params=[]
    if job_name: filters.append("job_name=%s"); params.append(job_name)
    if status: filters.append("status=%s"); params.append(status)
    if filters: query+=" WHERE "+ " AND ".join(filters)
    query+=" ORDER BY ran_at DESC LIMIT %s OFFSET %s"; params.extend([limit, offset])
    cur.execute(query, tuple(params))
    rows=cur.fetchall()
    cur.close(); conn.close()
    return rows

@router.get("/{log_id}", response_model=CronLog)
def get_cron_log(log_id: int):
    conn=get_db_connection(); cur=conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM cron_logs WHERE id=%s", (log_id,))
    row=cur.fetchone()
    cur.close(); conn.close()
    if not row: raise HTTPException(status_code=404, detail="Cron log not found")
    return row
