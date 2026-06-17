import os
import json

MEMORY_FILE = "normal_memory.json"
KNOWN_SAFE_WALLETS = {"wallet_alice", "wallet_bob", "wallet_carol", "wallet_dave"}


def event_to_text(event: dict) -> str:
    return f"transfer amount {event['amount']} USDC to wallet {event['target']} by agent {event['agent_id']}"


def load_memory() -> list:
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    return []


def save_memory(records: list):
    with open(MEMORY_FILE, "w") as f:
        json.dump(records, f)


def get_anomaly_score(event: dict) -> float:
    amount = event.get("amount", 0)
    target = event.get("target", "")

    # Unknown wallet → high suspicion
    if target not in KNOWN_SAFE_WALLETS:
        return 0.75

    # Large amount → high suspicion
    if amount > 500:
        return 0.80

    # Medium amount → borderline
    if amount > 150:
        return 0.25

    # Normal range (10–80 USDC) → low score proportional to amount
    score = round(amount / 1000, 4)

    if not event.get("anomaly", False):
        memory = load_memory()
        memory.append({"amount": amount, "target": target})
        if len(memory) > 100:
            memory = memory[-100:]
        save_memory(memory)

    return score
