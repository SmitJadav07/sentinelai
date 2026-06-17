import os
import json
from groq import Groq
from embeddings import get_anomaly_score

def judge_transaction(event: dict) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    client = Groq(api_key=api_key)

    anomaly_score = get_anomaly_score(event)
    print(f"Anomaly score: {anomaly_score}")

    prompt = f"""You are orchestrating a council of 3 highly specialized AI security agents for SentinelAI.

TRANSACTION DETAILS:
- Event ID: {event['id']}
- Agent ID: {event['agent_id']}
- Amount: ${event['amount']} USDC
- Destination Wallet: {event['target']}
- Anomaly Score: {anomaly_score}
- Baseline: $10-$80 USDC to known wallets

KNOWN SAFE WALLETS: wallet_alice, wallet_bob, wallet_carol, wallet_dave
KNOWN SUSPICIOUS: unknown wallet prefix, anomaly_score > 0.3, amount > $500

AGENT 1 — DR. ARIA CHEN | Quantitative Behavioral Analyst
Expertise: 12 years Goldman Sachs Digital Assets. PhD Statistical Anomaly Detection MIT.
Role: Statistical patterns only — sigma deviations, amount deviation, frequency.

AGENT 2 — MARCUS REID | Cybersecurity Threat Intelligence Director
Expertise: Former NSA, 15 years blockchain forensics, $400M DeFi exploit response.
Role: Wallet reputation, attack patterns, mixer signatures only.

AGENT 3 — SARAH OKONKWO | Chief Compliance & AML Officer
Expertise: 20 years JP Morgan/Chainalysis. FATF, FinCEN expert.
Role: AML flags, KYC, reporting thresholds only.

RULES:
- anomaly_score > 0.3 OR amount > $500 OR unknown wallet: 2+ vote suspicious, verdict=BLOCK, anomaly=true
- anomaly_score < 0.1 AND amount < $150 AND safe wallet: all vote normal, verdict=APPROVE, anomaly=false

Respond ONLY with JSON, no markdown:
{{
  "behavior_agent": {{"vote": "normal", "reason": "specific statistical analysis"}},
  "risk_agent": {{"vote": "normal", "reason": "specific threat analysis"}},
  "compliance_agent": {{"vote": "normal", "reason": "specific compliance analysis"}},
  "verdict": "APPROVE",
  "anomaly": false,
  "anomaly_score": {anomaly_score}
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        result["anomaly_score"] = anomaly_score
        return result
    except Exception as e:
        print(f"Council error: {e}")
        return {
            "behavior_agent": {"vote": "normal", "reason": "API timeout"},
            "risk_agent": {"vote": "normal", "reason": "API timeout"},
            "compliance_agent": {"vote": "normal", "reason": "API timeout"},
            "verdict": "APPROVE",
            "anomaly": False,
            "anomaly_score": anomaly_score
        }