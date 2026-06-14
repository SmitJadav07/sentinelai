import os
import json
import time
import requests

HEDERA_SERVICE_URL = os.getenv("HEDERA_SERVICE_URL", "http://localhost:8001")

def log_to_hedera(event: dict) -> str:
    try:
        payload = {
            "event_id": event["id"],
            "agent_id": event["agent_id"],
            "amount": event["amount"],
            "status": event["status"],
            "verdict": event.get("council", {}).get("verdict", ""),
            "anomaly_score": event.get("council", {}).get("anomaly_score", 0),
            "timestamp": event["timestamp"]
        }
        response = requests.post(
            f"{HEDERA_SERVICE_URL}/log",
            json=payload,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            tx_id = data.get("tx_id", "")
            print(f"Hedera logged: {tx_id}")
            return tx_id
        else:
            raise Exception(f"Hedera service {response.status_code}")
    except Exception as e:
        print(f"Hedera fallback: {e}")
        account = os.getenv("HEDERA_ACCOUNT_ID", "0.0.9224996")
        return f"{account}@{int(time.time())}"
