import os
from groq import Groq
import json

def judge_transaction(event: dict) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    print(f"Using Groq key: {api_key[:10] if api_key else 'NOT FOUND'}")
    
    client = Groq(api_key=api_key)

    prompt = f"""You are a 3-agent AI security council for a blockchain payment system.

Transaction to judge:
- Action: {event['action']}
- Amount: ${event['amount']} USDC
- Target wallet: {event['target']}
- Agent ID: {event['agent_id']}
- Normal baseline: $50 USDC max

Rules:
- If amount > $150 OR target contains 'unknown': 2+ agents must vote suspicious, verdict = BLOCK, anomaly = true
- Otherwise: agents vote normal, verdict = APPROVE, anomaly = false

Respond ONLY with this exact JSON, no markdown, no extra text:
{{
  "behavior_agent": {{"vote": "normal", "reason": "brief reason"}},
  "risk_agent": {{"vote": "normal", "reason": "brief reason"}},
  "compliance_agent": {{"vote": "normal", "reason": "brief reason"}},
  "verdict": "APPROVE",
  "anomaly": false
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    raw = response.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    return result
