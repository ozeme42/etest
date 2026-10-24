import re
import json

with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Let's inspect all section headings
headings = re.findall(r'(\s*-\s*(\d+\.\s*Bölüm[^\n]+|Hatırlayalım[^\n]+|Yazılıya Hazırlık[^\n]+))', text)
for h in headings:
    print(h[0].strip())
