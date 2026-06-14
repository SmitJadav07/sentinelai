const dotenv = require("dotenv");
const { Client, PrivateKey, TopicCreateTransaction } = require("@hashgraph/sdk");

dotenv.config();

const { HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY } = process.env;

if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
  console.error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in .env");
  process.exit(1);
}

async function main() {
  const client = Client.forTestnet();
  const operatorKey = PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY);
  client.setOperator(HEDERA_ACCOUNT_ID, operatorKey);

  const txResponse = await new TopicCreateTransaction().execute(client);
  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId;

  console.log("New Hedera topic created:", topicId.toString());
}

main().catch((error) => {
  console.error("Failed to create topic:", error);
  process.exit(1);
});
