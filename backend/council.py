import os
import json
import google.generativeai as genai
from embeddings import get_anomaly_score

def judge_transaction(event: dict) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    anomaly_score = get_anomaly_score(event)
    print(f"Anomaly score: {anomaly_score}")

    prompt = f"""You are orchestrating a council of 3 highly specialized AI security agents for SentinelAI, an enterprise-grade blockchain transaction monitoring system.

TRANSACTION DETAILS:
- Event ID: {event['id']}
- Agent ID: {event['agent_id']}
- Action Type: {event['action']}
- Amount: ${event['amount']} USDC
- Destination Wallet: {event['target']}
- Anomaly Score: {anomaly_score} (0.0 = perfectly normal, 1.0 = completely anomalous)
- Historical Baseline: Agent normally transfers $10-$80 USDC to known wallets

KNOWN SAFE WALLETS: wallet_alice, wallet_bob, wallet_carol, wallet_dave
KNOWN SUSPICIOUS: unknown wallet prefix, anomaly_score > 0.3, amount > $500

AGENT 1 — DR. ARIA CHEN | Quantitative Behavioral Analyst
Expertise: 12 years at Goldman Sachs Digital Assets. PhD in Statistical Anomaly Detection from MIT.
Role: Analyze ONLY statistical patterns — amount deviation, frequency, timing. Think in sigma deviations.

AGENT 2 — MARCUS REID | Cybersecurity Threat Intelligence Director
Expertise: Former NSA analyst, 15 years blockchain forensics. Led response to $400M DeFi exploits.
Role: Analyze ONLY wallet reputation, attack patterns, mixer signatures, exposure risk.

AGENT 3 — SARAH OKONKWO | Chief Compliance & AML Officer
Expertise: 20 years at JP Morgan and Chainalysis. Certified AML Specialist. Expert in FATF, FinCEN.
Role: Analyze ONLY regulatory compliance — AML flags, KYC, reporting thresholds, sanctions.

VOTING RULES:
- anomaly_score > 0.3 OR amount > $500 OR wallet NOT in safe list: 2+ agents vote suspicious, verdict = BLOCK, anomaly = true
- anomaly_score < 0.1 AND amount < $150 AND wallet in safe list: all vote normal, verdict = APPROVE, anomaly = false
- Be specific with numbers and technical terms, never generic

Respond ONLY with this exact JSON, zero extra text, zero markdown:
{{
  "behavior_agent": {{
    "vote": "normal",
    "reason": "Dr. Aria Chen specific statistical analysis with actual numbers"
  }},
  "risk_agent": {{
    "vote": "normal",
    "reason": "Marcus Reid specific threat intelligence analysis"
  }},
  "compliance_agent": {{
    "vote": "normal",
    "reason": "Sarah Okonkwo specific compliance analysis with regulatory frameworks"
  }},
  "verdict": "APPROVE",
  "anomaly": false,
  "anomaly_score": {anomaly_score}
}}"""

    response = model.generate_content(prompt)
    raw = response.text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    result["anomaly_score"] = anomaly_score
    return result
