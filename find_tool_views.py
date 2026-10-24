import json

transcript_path = r"C:\Users\mahmut\.gemini\antigravity\brain\e6dfe324-d1d6-4c47-9899-b6549013b910\.system_generated\logs\transcript_full.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "answer_keys" in line:
            data = json.loads(line)
            # find where answer_keys is
            for tc in data.get("tool_calls", []):
                args = tc.get("args") or tc.get("arguments") or {}
                if isinstance(args, str):
                    try: args = json.loads(args)
                    except: pass
                if isinstance(args, dict):
                    path = args.get("AbsolutePath", "")
                    if "answer_keys" in path:
                        print(f"Line {i}: {path}")
