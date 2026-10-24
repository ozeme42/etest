import json

transcript_path = r"C:\Users\mahmut\.gemini\antigravity\brain\e6dfe324-d1d6-4c47-9899-b6549013b910\.system_generated\logs\transcript_full.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i in [2515, 2517, 2530, 2532]:
            data = json.loads(line)
            print(f"=== Line {i} ===")
            content = data.get("content") or ""
            thinking = data.get("thinking") or ""
            print("Content preview:", content[:500])
            print("Thinking preview:", thinking[:500])
            # Save full text if it contains answers
            with open(f"line_{i}.txt", "w", encoding="utf-8") as out:
                out.write("CONTENT:\n" + content + "\n\nTHINKING:\n" + thinking)
