require('dotenv').config()
const express = require('express')
const cors = require('cors')
const {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicId
} = require('@hashgraph/sdk')

const app = express()
app.use(cors())
app.use(express.json())

const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID
const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY
const TOPIC_ID = process.env.HEDERA_TOPIC_ID

console.log('Account:', ACCOUNT_ID)
console.log('Topic:', TOPIC_ID)

function getClient() {
  const client = Client.forTestnet()
  client.setOperator(
    AccountId.fromString(ACCOUNT_ID),
    PrivateKey.fromStringECDSA(PRIVATE_KEY)
  )
  return client
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', topic: TOPIC_ID })
})

app.post('/log', async (req, res) => {
  try {
    const event = req.body
    const message = JSON.stringify({
      event_id: event.event_id,
      agent_id: event.agent_id,
      amount: event.amount,
      status: event.status,
      timestamp: event.timestamp
    })

    const client = getClient()

    const receipt = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(TOPIC_ID))
      .setMessage(message)
      .execute(client)

    const txId = receipt.transactionId.toString()
    const hashscan = `https://hashscan.io/testnet/topic/${TOPIC_ID}`

    console.log('Hedera TX:', txId)
    console.log('Hashscan:', hashscan)

    client.close()

    res.json({
      tx_id: txId,
      hashscan_url: hashscan
    })

  } catch (err) {
    console.error('Hedera error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 8001
app.listen(PORT, () => {
  console.log(`Hedera service running on port ${PORT}`)
  console.log(`Topic ID: ${TOPIC_ID}`)
})