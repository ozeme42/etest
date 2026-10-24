import re

with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()
print(f"Total lines in fen_transcriptions_complete: {len(lines)}")
for l in lines[:30]:
    print(l)
