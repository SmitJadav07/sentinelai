import os
import requests
import uuid

CIRCLE_API_KEY = os.getenv("CIRCLE_API_KEY", "")
BASE_URL = "https://api.circle.com/v1/w3s"

headers = {
    "Authorization": f"Bearer {CIRCLE_API_KEY}",
    "Content-Type": "application/json"
}

def create_wallet_set() -> str:
    try:
        response = requests.post(
            f"{BASE_URL}/developer/walletSets",
            headers=headers,
            json={
                "idempotencyKey": str(uuid.uuid4()),
                "name": "SentinelAI Agents"
            },
            timeout=10
        )
        if response.status_code in [200, 201]:
            data = response.json()
            wallet_set_id = data["data"]["walletSet"]["id"]
            print(f"Wallet set created: {wallet_set_id}")
            return wallet_set_id
        else:
            print(f"Wallet set error: {response.text}")
            return ""
    except Exception as e:
        print(f"Circle error: {e}")
        return ""

def create_agent_wallet(wallet_set_id: str, agent_id: str) -> str:
    try:
        response = requests.post(
            f"{BASE_URL}/developer/wallets",
            headers=headers,
            json={
                "idempotencyKey": str(uuid.uuid4()),
                "walletSetId": wallet_set_id,
                "blockchains": ["ARB-SEPOLIA"],
                "count": 1,
                "metadata": [{"name": agent_id}]
            },
            timeout=10
        )
        if response.status_code in [200, 201]:
            data = response.json()
            wallet_id = data["data"]["wallets"][0]["id"]
            print(f"Agent wallet created: {wallet_id}")
            return wallet_id
        else:
            print(f"Wallet error: {response.text}")
            return ""
    except Exception as e:
        print(f"Circle wallet error: {e}")
        return ""

def make_transfer(from_wallet_id: str, amount: float, target: str) -> dict:
    try:
        response = requests.post(
            f"{BASE_URL}/developer/transactions/transfer",
            headers=headers,
            json={
                "idempotencyKey": str(uuid.uuid4()),
                "walletId": from_wallet_id,
                "amounts": [str(round(amount, 2))],
                "destinationAddress": target,
                "tokenId": "USDC",
                "feeLevel": "MEDIUM"
            },
            timeout=10
        )
        if response.status_code in [200, 201]:
            data = response.json()
            tx_id = data["data"]["id"]
            print(f"Arc transfer initiated: {tx_id}")
            return {"success": True, "tx_id": tx_id}
        else:
            print(f"Transfer error: {response.text}")
            return {"success": False, "error": response.text}
    except Exception as e:
        print(f"Transfer error: {e}")
        return {"success": False, "error": str(e)}
