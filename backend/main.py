from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_all_events
from agent import generate_event
import threading
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def agent_loop():
    while True:
        try:
            generate_event()
        except Exception as e:
            print(f"Agent error: {e}")
        time.sleep(5)

threading.Thread(target=agent_loop, daemon=True).start()

@app.get("/events")
def get_events():
    return get_all_events()

@app.post("/attack")
def trigger_attack():
    event = generate_event(force_attack=True)
    return event

@app.get("/health")
def health():
    return {"status": "running"}