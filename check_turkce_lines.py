import re

with open("turkce_transcription_from_summary.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()
print(f"Total lines in turkce_transcription_from_summary: {len(lines)}")
for l in lines[:30]:
    print(l)
