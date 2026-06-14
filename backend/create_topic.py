import os
from dotenv import load_dotenv
load_dotenv()

from hiero_sdk_python import (
    Client, AccountId, PrivateKey,
    TopicCreateTransaction,
)

account_id = os.getenv("HEDERA_ACCOUNT_ID")
private_key = os.getenv("HEDERA_PRIVATE_KEY")

operatorId = AccountId.from_string(account_id)
operatorKey = PrivateKey.from_string(private_key)

client = Client()
client.set_for_testnet()
client.set_operator(operatorId, operatorKey)

transaction = (
    TopicCreateTransaction(
        memo="SentinelAI Audit Trail"
    )
    .freeze_with(client)
    .sign(operatorKey)
)

receipt = transaction.execute(client)
print(f"Topic created: {receipt.topic_id}")
print(f"View on hashscan: https://hashscan.io/testnet/topic/{receipt.topic_id}")
print(f"SAVE THIS TOPIC ID — add it to your .env file as HEDERA_TOPIC_ID")
