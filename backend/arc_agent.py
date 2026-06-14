import os
import requests
import uuid
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

CIRCLE_API_KEY = os.getenv("CIRCLE_API_KEY", "")
ENTITY_SECRET = os.getenv("CIRCLE_ENTITY_SECRET", "")
BASE_URL = "https://api.circle.com/v1/w3s"

def get_headers():
    return {
        "Authorization": f"Bearer {CIRCLE_API_KEY}",
        "Content-Type": "application/json"
    }

def get_ciphertext() -> str:
    r = requests.get(f"{BASE_URL}/config/entity/publicKey", headers=get_headers(), timeout=10)
    pem = r.json()["data"]["publicKey"]
    pub = serialization.load_pem_public_key(pem.encode(), backend=default_backend())
    encrypted = pub.encrypt(
        bytes.fromhex(ENTITY_SECRET),
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    )
    return base64.b64encode(encrypted).decode()

def create_wallet_set() -> str:
    try:
        r = requests.post(
            f"{BASE_URL}/developer/walletSets",
            headers=get_headers(),
            json={"idempotencyKey": str(uuid.uuid4()), "name": "SentinelAI Agents", "entitySecretCiphertext": get_ciphertext()},
            timeout=15
        )
        print(f"Wallet set: {r.status_code} {r.text[:150]}")
        if r.status_code in [200, 201]:
            return r.json()["data"]["walletSet"]["id"]
        return ""
    except Exception as e:
        print(f"create_wallet_set error: {e}")
        return ""

def create_agent_wallet(wallet_set_id: str, agent_id: str) -> str:
    try:
        r = requests.post(
            f"{BASE_URL}/developer/wallets",
            headers=get_headers(),
            json={
                "idempotencyKey": str(uuid.uuid4()),
                "walletSetId": wallet_set_id,
                "blockchains": ["ARC-TESTNET"],
                "count": 1,
                "entitySecretCiphertext": get_ciphertext(),
                "metadata": [{"name": agent_id, "refId": agent_id}]
            },
            timeout=15
        )
        print(f"Wallet create: {r.status_code} {r.text[:150]}")
        if r.status_code in [200, 201]:
            return r.json()["data"]["wallets"][0]["id"]
        return ""
    except Exception as e:
        print(f"create_agent_wallet error: {e}")
        return ""

def get_wallet_address(wallet_id: str) -> str:
    try:
        r = requests.get(f"{BASE_URL}/wallets/{wallet_id}", headers=get_headers(), timeout=10)
        if r.status_code == 200:
            return r.json()["data"]["wallet"]["address"]
        return ""
    except Exception as e:
        print(f"get_wallet_address error: {e}")
        return ""

def make_transfer(from_wallet_id: str, amount: float, destination_address: str) -> dict:
    try:
        r = requests.post(
            f"{BASE_URL}/developer/transactions/transfer",
            headers=get_headers(),
            json={
                "idempotencyKey": str(uuid.uuid4()),
                "walletId": from_wallet_id,
                "amounts": [str(round(amount, 2))],
                "destinationAddress": destination_address,
                "blockchain": "ARC-TESTNET",
                "entitySecretCiphertext": get_ciphertext(),
                "feeLevel": "MEDIUM"
            },
            timeout=15
        )
        print(f"Transfer: {r.status_code} {r.text[:150]}")
        if r.status_code in [200, 201]:
            return {"success": True, "tx_id": r.json()["data"]["id"]}
        return {"success": False, "error": r.text}
    except Exception as e:
        print(f"make_transfer error: {e}")
        return {"success": False, "error": str(e)}