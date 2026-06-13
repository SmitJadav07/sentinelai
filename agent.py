import time
import uuid
import random
from database import save_event
from council import judge_transaction

NORMAL_WALLETS = ["wallet_alice", "wallet_bob", "wallet_carol", "wallet_dave"]
SUSPICIOUS_WALLETS = ["unknown_wallet_xyz", "unknown_wallet_abc"]

def generate_event(force_attack=False):
    if force_attack:
        amount = random.uniform(800, 2000)
        target = random.choice(SUSPICIOUS_WALLETS)
    else:
        amount = random.uniform(10, 80)
        target = random.choice(NORMAL_WALLETS)

    event = {
        "id": f"evt_{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "agent_id": "agent_01",
        "action": "transfer",
        "amount": round(amount, 2),
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
    event["hedera_tx_id"] = f"0.0.5234@{int(event['timestamp'])}"

    save_event(event)
    return event
