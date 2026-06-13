import sqlite3
import json
from datetime import datetime

def init_db():
    conn = sqlite3.connect("sentinel.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp REAL,
        agent_id TEXT,
        action TEXT,
        amount REAL,
        target TEXT,
        status TEXT,
        anomaly INTEGER,
        council TEXT,
        hedera_tx_id TEXT
    )''')
    conn.commit()
    conn.close()

def save_event(event: dict):
    conn = sqlite3.connect("sentinel.db")
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO events 
        VALUES (?,?,?,?,?,?,?,?,?,?)''',
        (
            event["id"],
            event["timestamp"],
            event["agent_id"],
            event["action"],
            event["amount"],
            event["target"],
            event["status"],
            1 if event["anomaly"] else 0,
            json.dumps(event["council"]),
            event.get("hedera_tx_id", "")
        )
    )
    conn.commit()
    conn.close()

def get_all_events():
    conn = sqlite3.connect("sentinel.db")
    c = conn.cursor()
    c.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    events = []
    for row in rows:
        events.append({
            "id": row[0],
            "timestamp": row[1],
            "agent_id": row[2],
            "action": row[3],
            "amount": row[4],
            "target": row[5],
            "status": row[6],
            "anomaly": bool(row[7]),
            "council": json.loads(row[8]),
            "hedera_tx_id": row[9]
        })
    return events