from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_all_events
from agent import generate_event
import threading
import time
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# Configuration for testing
LOOP_ENABLED = os.getenv("LOOP_ENABLED", "false").lower() == "true"
LOOP_INTERVAL = int(os.getenv("LOOP_INTERVAL", "300"))  # Default 5 minutes

def agent_loop():
    while True:
        try:
            generate_event()
        except Exception as e:
            print(f"Agent error: {e}")
        time.sleep(LOOP_INTERVAL)

if LOOP_ENABLED:
    threading.Thread(target=agent_loop, daemon=True).start()
    print(f"Agent loop enabled - running every {LOOP_INTERVAL}s")
else:
    print("Agent loop disabled - set LOOP_ENABLED=true to enable")

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