import json

with open('mat_ocr_lines.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Pages in mat_ocr_lines.json:", sorted([int(k) for k in data.keys()]))
for k in sorted([int(k) for k in data.keys()]):
    lines = data[str(k)]
    non_empty = [l.strip() for l in lines if l.strip()]
    print(f"Page {k}: {len(non_empty)} lines. Sample: {non_empty[:3]}")
