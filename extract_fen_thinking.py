import json

transcript_path = r"C:\Users\mahmut\.gemini\antigravity\brain\e6dfe324-d1d6-4c47-9899-b6549013b910\.system_generated\logs\transcript_full.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "answer_keys/fen" in line and "PLANNER_RESPONSE" in line:
            data = json.loads(line)
            thinking = data.get("thinking", "")
            print(f"Line {i}: thinking len = {len(thinking)}")
            with open(f"fen_thinking_{i}.txt", "w", encoding="utf-8") as out:
                out.write(thinking)
