import httpx
import asyncio
import json
import websockets
import threading
from typing import Callable, Optional

class APIService:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.on_alert_callback: Optional[Callable] = None
        self._ws_thread: Optional[threading.Thread] = None
        self._loop = asyncio.new_event_loop()

    async def login(self, team_id: str, password: str):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/auth/login",
                    json={"teamId": team_id, "password": password},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                self.token = data.get("token")
                self.user_id = data.get("user", {}).get("id")
                return data
            except Exception as e:
                return {"error": str(e)}

    async def register(self, team_id: str, password: str, name: str, phone: str):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/auth/register",
                    json={"teamId": team_id, "password": password, "name": name, "phone": phone},
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    def start_websocket(self, on_alert: Callable):
        self.on_alert_callback = on_alert
        if not self.token:
            return
        
        self._ws_thread = threading.Thread(target=self._run_ws_loop, daemon=True)
        self._ws_thread.start()

    def _run_ws_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._ws_handler())

    async def _ws_handler(self):
        while True:
            try:
                async with websockets.connect(self.ws_url) as websocket:
                    self.ws = websocket
                    # Authenticate over WS
                    await websocket.send(json.dumps({
                        "type": "team:login",
                        "token": self.token
                    }))

                    async for message in websocket:
                        data = json.loads(message)
                        if data.get("type") == "alert:new" and self.on_alert_callback:
                            self.on_alert_callback(data.get("data"))
            except Exception as e:
                print(f"WebSocket error: {e}")
                await asyncio.sleep(5)

    async def update_location(self, lat: float, lng: float):
        if self.ws and self.ws.open:
            await self.ws.send(json.dumps({
                "type": "team:location",
                "lat": lat,
                "lng": lng
            }))

    async def update_status(self, available: bool, current_alert_id: str = None):
        if self.ws and self.ws.open:
            await self.ws.send(json.dumps({
                "type": "team:status",
                "available": available,
                "currentAlertId": current_alert_id
            }))

    async def accept_alert(self, alert_id: str):
        if self.ws and self.ws.open:
            await self.ws.send(json.dumps({
                "type": "alert:accept",
                "alertId": alert_id
            }))

    async def complete_alert(self, alert_id: str):
        if self.ws and self.ws.open:
            await self.ws.send(json.dumps({
                "type": "alert:complete",
                "alertId": alert_id
            }))
