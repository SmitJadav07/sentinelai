import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')
MEMORY_FILE = "normal_memory.json"

def event_to_text(event: dict) -> str:
    return f"transfer amount {event['amount']} USDC to wallet {event['target']} by agent {event['agent_id']}"

def load_memory() -> list:
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    return []

def save_memory(vectors: list):
    with open(MEMORY_FILE, "w") as f:
        json.dump(vectors, f)

def get_anomaly_score(event: dict) -> float:
    text = event_to_text(event)
    vector = model.encode([text])[0].tolist()
    memory = load_memory()
    if len(memory) < 5:
        memory.append(vector)
        save_memory(memory)
        return 0.0
    current = np.array(vector).reshape(1, -1)
    past = np.array(memory)
    similarities = cosine_similarity(current, past)[0]
    avg_similarity = float(np.mean(similarities))
    anomaly_score = round(1.0 - avg_similarity, 4)
    if not event.get('anomaly', False):
        memory.append(vector)
        if len(memory) > 100:
            memory = memory[-100:]
        save_memory(memory)
    return anomaly_score
