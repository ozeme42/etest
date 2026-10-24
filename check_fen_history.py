import json

transcript_path = r"C:\Users\mahmut\.gemini\antigravity\brain\e6dfe324-d1d6-4c47-9899-b6549013b910\.system_generated\logs\transcript_full.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "FEN_U" in line or "bumerang_fen_answers" in line:
            data = json.loads(line)
            print(f"Line {i}, type={data.get('type')}, source={data.get('source')}")
            # check if it wrote any code
            content = data.get("content") or ""
            thinking = data.get("thinking") or ""
            calls = data.get("tool_calls", [])
            for c in calls:
                print(f"  Tool: {c.get('tool_name') or c.get('name')}")
                args = c.get("args") or c.get("arguments") or {}
                if isinstance(args, dict) and "TargetFile" in args:
                    print(f"  TargetFile: {args['TargetFile']}")
