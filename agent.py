import time
import uuid
import random
from database import save_event
from council import judge_transaction
from hedera_logger import log_to_hedera

NORMAL_WALLETS = ["wallet_alice", "wallet_bob", "wallet_carol", "wallet_dave"]
SUSPICIOUS_WALLETS = ["unknown_wallet_xyz", "unknown_wallet_abc"]

def generate_event(force_attack=False):
    if force_attack:
        amount = round(random.uniform(800, 2000), 2)
        target = random.choice(SUSPICIOUS_WALLETS)
    else:
        amount = round(random.uniform(10, 80), 2)
        target = random.choice(NORMAL_WALLETS)

    event = {
        "id": f"evt_{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "agent_id": "agent_01",
        "action": "transfer",
        "amount": amount,
        "target": target,
        "status": "pending",
        "anomaly": False,
        "council": {},
        "hedera_tx_id": ""
    }

    council_result = judge_transaction(event)
    event["council"] = council_result
    event["anomaly"] = council_result.get("anomaly", False)
    event["status"] = "blocked" if event["anomaly"] else "approved"
    hedera_tx = log_to_hedera(event)
    event["hedera_tx_id"] = hedera_tx
    save_event(event)
    print(f"Event: {event['id']} | ${event['amount']} → {event['target']} | {event['status'].upper()}")
    return event

def agent_loop():
    while True:
        try:
            generate_event()
        except Exception as e:
            print(f"Agent error: {e}")
        time.sleep(45)