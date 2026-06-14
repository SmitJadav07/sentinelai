# SentinelAI — Real-Time AI Security Layer for Autonomous Blockchain Agents

> "We're Stripe fraud detection — but for AI agents."

SentinelAI is an enterprise-grade behavioral monitoring system that intercepts, scores, and judges every transaction made by autonomous AI agents before it settles on-chain. Built at ETHGlobal NYC 2026.

---

## The Problem

AI agents are being given wallets and told to move money autonomously. There is no security layer between an AI agent and a catastrophic financial decision. A compromised or hallucinating agent can drain wallets, send funds to unknown addresses, and execute transactions nobody intended — with no human in the loop.

## The Solution

SentinelAI sits between every AI agent and every transaction. Before any USDC moves, SentinelAI:

1. Intercepts the transaction
2. Scores it using vector embeddings for anomaly detection
3. Sends it to a 3-agent AI council for a majority vote
4. Blocks or approves it in real time
5. Logs the verdict permanently to Hedera blockchain

---

## Architecture

```
AI Agent → Arc Testnet USDC Transaction
         → SentinelAI intercepts
         → Vector Embeddings (anomaly score)
         → 3-Agent AI Council (Gemini 2.5 Flash)
         → BLOCK or APPROVE
         → Hedera HCS permanent audit log
         → Dashboard shows live
```

---

## AI Security Council

Three specialized AI agents with distinct expertise debate every transaction:

- **Dr. Aria Chen** — Quantitative Behavioral Analyst (12 years Goldman Sachs Digital Assets, PhD Statistical Anomaly Detection MIT). Analyzes sigma deviations, amount patterns, frequency.
- **Marcus Reid** — Cybersecurity Threat Intelligence Director (Former NSA, 15 years blockchain forensics, led response to $400M DeFi exploits). Analyzes wallet reputation, attack patterns, mixer signatures.
- **Sarah Okonkwo** — Chief Compliance & AML Officer (20 years JP Morgan/Chainalysis, FATF/FinCEN expert). Analyzes regulatory compliance, AML flags, reporting thresholds.

2-of-3 votes required to block a transaction.

---

## Integrations

| Integration | What it does | Status |
|---|---|---|
| **Hedera HCS** | Permanent immutable audit log of every verdict | ✅ Real testnet |
| **Circle / Arc** | AI agent wallet creation and USDC transfers on ARC-TESTNET | ✅ Real testnet |
| **Gemini 2.5 Flash** | Powers the 3-agent AI council | ✅ Working |
| **ENS** | Human-readable agent identity (agent01.sentinel.eth) | ✅ Display |
| **Sentence Transformers** | Vector embeddings for behavioral anomaly scoring | ✅ Working |

---

## Tech Stack

**Backend:** Python, FastAPI, SQLite, Sentence Transformers, Google Gemini 2.5 Flash

**Frontend:** Next.js, TypeScript, Tailwind CSS

**Blockchain:** Hedera HCS (Node.js SDK), Circle Developer Wallets, ARC-TESTNET

---

## Project Structure

```
sentinelai/
├── backend/
│   ├── main.py           # FastAPI server, /events and /attack endpoints
│   ├── agent.py          # Agent loop, Circle wallet init, event generation
│   ├── council.py        # Gemini AI council — 3 expert agents
│   ├── embeddings.py     # Sentence transformer anomaly scoring
│   ├── arc_agent.py      # Circle API — wallet creation and USDC transfers
│   ├── hedera_logger.py  # Calls hedera-service on port 8001
│   ├── chainlink.py      # Local attestation
│   └── database.py       # SQLite storage
├── frontend/
│   └── app/page.tsx      # Next.js dashboard
└── hedera-service/
    └── server.js         # Node.js Hedera SDK microservice
```

---

## Setup & Running

### Prerequisites
- Python 3.13+
- Node.js 18+
- Gemini API key (aistudio.google.com)
- Circle API key (console.circle.com)
- Hedera testnet account (portal.hedera.com)

### Step 1 — Clone
```bash
git clone https://github.com/SmitJadav07/sentinelai.git
cd sentinelai
```

### Step 2 — Backend environment
Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_key
HEDERA_ACCOUNT_ID=0.0.xxxxxxx
HEDERA_PRIVATE_KEY=0xxxxxxxxxxx
HEDERA_TOPIC_ID=0.0.xxxxxxx
HEDERA_SERVICE_URL=http://localhost:8001
CIRCLE_API_KEY=TEST_API_KEY:xxx:xxx
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_ID=your_wallet_id
DEMO_DESTINATION_ADDRESS=your_address
LOOP_ENABLED=true
```

### Step 3 — Run all 3 services

**Terminal 1 — Hedera microservice:**
```bash
cd hedera-service
npm install
node server.js
```

**Terminal 2 — Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/events` | GET | Get all monitored transactions |
| `/attack` | POST | Simulate an attack transaction |

---

## Hedera Audit Trail

All verdicts are permanently logged to Hedera HCS Topic `0.0.9228035`.

Verify on hashscan.io: https://hashscan.io/testnet/topic/0.0.9228035

---

## Team

- **Eshan Potdar** — Backend, AI Council, Circle/Arc Integration, Hedera
- **Smit Jadav** — Frontend, ENS Integration, Hedera Service

---

## Built At

ETHGlobal NYC 2026
