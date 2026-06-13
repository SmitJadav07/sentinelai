import os
import json
import google.generativeai as genai

def judge_transaction(event: dict) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        model = genai.GenerativeModel("gemini-pro")

    prompt = f"""You are a 3-agent AI security council for a blockchain payment system.

Transaction:
- Action: {event['action']}
- Amount: ${event['amount']} USDC
- Target: {event['target']}
- Agent: {event['agent_id']}
- Normal baseline: $50 USDC max

Rules:
- If amount > $150 OR target contains 'unknown': 2+ agents vote suspicious, verdict = BLOCK, anomaly = true
- Otherwise: all agents vote normal, verdict = APPROVE, anomaly = false

Respond ONLY with this JSON, no markdown, no extra text:
{{
  "behavior_agent": {{"vote": "normal", "reason": "brief reason"}},
  "risk_agent": {{"vote": "normal", "reason": "brief reason"}},
  "compliance_agent": {{"vote": "normal", "reason": "brief reason"}},
  "verdict": "APPROVE",
  "anomaly": false,
  "anomaly_score": 0.1
}}"""

    response = model.generate_content(prompt)
    raw = response.text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    return result