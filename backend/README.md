# SentinelAI Backend

## What this is
Real-time AI security layer for autonomous blockchain agents. Every transaction made by an AI agent is intercepted, scored by vector embeddings, debated by a 3-agent AI council, and permanently logged to Hedera blockchain.

## Setup (run these in order)

### 1. Clone and enter backend
git clone https://github.com/SmitJadav07/sentinelai.git
cd sentinelai
git checkout backend
cd backend

### 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

### 3. Install all libraries
pip install -r requirements.txt

### 4. Create your .env file
Create a file called .env inside the backend folder with this content:
GEMINI_API_KEY=your_gemini_key_here
HEDERA_ACCOUNT_ID=0.0.9224996
HEDERA_PRIVATE_KEY=your_hedera_private_key
HEDERA_EVM_ADDRESS=your_hedera_evm_address

### 5. Run the server
GEMINI_API_KEY=your_key_here uvicorn main:app --reload --port 8000

## Endpoints
- GET  http://localhost:8000/events  → all transactions
- POST http://localhost:8000/attack  → simulate attack
- GET  http://localhost:8000/health  → server status

## Stop the server
Press Control + C in Terminal
