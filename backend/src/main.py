import os
from fastapi import FastAPI
from src.routers.zerodha_accounts import router as accounts_router
from src.routers.admin_settings import router as settings_router
from src.routers.orders import router as orders_router
from src.routers.watchlist import router as watchlist_router
from src.routers.gtt import router as gtt_router
from src.routers.cron_logs import router as cron_logs_router
from fastapi import WebSocket, WebSocketDisconnect
from src.utils.ws_manager import ConnectionManager

app = FastAPI()
manager = ConnectionManager()

app.include_router(accounts_router)
app.include_router(settings_router)
app.include_router(orders_router)
app.include_router(watchlist_router)
app.include_router(gtt_router)
app.include_router(cron_logs_router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws/ticks")
async def websocket_ticks_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/orders")
async def websocket_orders_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
