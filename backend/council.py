import os
import json

TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

def get_mock_result(event: dict) -> dict:
    """Mock council result for testing without API calls"""
    amount = event["amount"]
    target = event["target"]
    
    # Simple logic: flag if high amount or suspicious wallet
    is_suspicious = amount > 150 or "unknown" in target
    
    return {
        "behavior_agent": {"vote": "suspicious" if is_suspicious else "normal", "reason": "mock"},
        "risk_agent": {"vote": "suspicious" if is_suspicious else "normal", "reason": "mock"},
        "compliance_agent": {"vote": "suspicious" if is_suspicious else "normal", "reason": "mock"},
        "verdict": "BLOCK" if is_suspicious else "APPROVE",
        "anomaly": is_suspicious
    }

def judge_transaction(event: dict) -> dict:
    if TEST_MODE:
        print(f"[TEST MODE] Returning mock council result for event {event['id']}")
        return get_mock_result(event)
    
    # Use Gemini API in production
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    print(f"Using Gemini key: {api_key[:10] if api_key else 'NOT FOUND'}")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-pro")

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

    response = model.generate_content(prompt)
    raw = response.text.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    return result
