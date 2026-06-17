import time
import uuid
import random
import os
from database import save_event
from council import judge_transaction
from hedera_logger import log_to_hedera

NORMAL_WALLETS = ["wallet_alice", "wallet_bob", "wallet_carol", "wallet_dave"]
SUSPICIOUS_WALLETS = ["unknown_wallet_xyz", "unknown_wallet_abc"]

_wallet_set_id = None
_agent_wallet_id = None
_agent_wallet_address = None

def init_circle_wallet():
    global _wallet_set_id, _agent_wallet_id, _agent_wallet_address

    if not os.getenv("CIRCLE_API_KEY") or not os.getenv("CIRCLE_ENTITY_SECRET"):
        print("=== CIRCLE: credentials not configured, skipping wallet init ===")
        return

    saved_wallet_id = os.getenv("CIRCLE_WALLET_ID", "")
    if saved_wallet_id:
        print(f"=== CIRCLE: reusing wallet {saved_wallet_id} ===")
        _agent_wallet_id = saved_wallet_id
        from arc_agent import get_wallet_address
        _agent_wallet_address = get_wallet_address(_agent_wallet_id)
        print(f"=== CIRCLE READY: {_agent_wallet_address} ===")
        return
    print("=== CIRCLE SETUP STARTING ===")
    try:
        from arc_agent import create_wallet_set, create_agent_wallet, get_wallet_address
        _wallet_set_id = create_wallet_set()
        print(f"Wallet set ID: {_wallet_set_id}")
        if _wallet_set_id:
            _agent_wallet_id = create_agent_wallet(_wallet_set_id, "agent_01")
            print(f"Agent wallet ID: {_agent_wallet_id}")
            if _agent_wallet_id:
                _agent_wallet_address = get_wallet_address(_agent_wallet_id)
                print(f"=== CIRCLE READY: {_agent_wallet_address} ===")
            else:
                print("=== CIRCLE: wallet creation failed ===")
        else:
            print("=== CIRCLE: wallet set creation failed ===")
    except Exception as e:
        import traceback
        print(f"=== CIRCLE ERROR: {e} ===")
        traceback.print_exc()

init_circle_wallet()

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
        "hedera_tx_id": "",
        "circle_tx_id": "",
        "circle_wallet": _agent_wallet_address or "not_configured"
    }

    council_result = judge_transaction(event)
    event["council"] = council_result
    event["anomaly"] = council_result.get("anomaly", False)
    event["status"] = "blocked" if event["anomaly"] else "approved"

    if not event["anomaly"] and _agent_wallet_id:
        try:
            from arc_agent import make_transfer
            destination = os.getenv("DEMO_DESTINATION_ADDRESS", "")
            if destination:
                result = make_transfer(_agent_wallet_id, event["amount"], destination)
                if result["success"]:
                    event["circle_tx_id"] = result["tx_id"]
                    print(f"Real USDC transfer: {result['tx_id']}")
        except Exception as e:
            print(f"Arc transfer error: {e}")

    hedera_tx = log_to_hedera(event)
    event["hedera_tx_id"] = hedera_tx
    save_event(event)
    print(f"Event: {event['id']} | ${event['amount']} | {event['status'].upper()}")
    return event

def agent_loop():
    while True:
        try:
            generate_event()
        except Exception as e:
            print(f"Agent error: {e}")
        time.sleep(45)
