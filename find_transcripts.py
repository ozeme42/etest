import json

transcript_path = r"C:\Users\mahmut\.gemini\antigravity\brain\e6dfe324-d1d6-4c47-9899-b6549013b910\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "Q1–90" in line or "Q1-90" in line or "Q1-23" in line or "Q24-43" in line or "Q1–23" in line:
            print(f"Match in line {i}")
