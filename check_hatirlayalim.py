with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "Hatırlayalım" in l:
        print(f"Line {i+1}: {l.strip()}")
        for k in range(1, 4):
            if i+k < len(lines):
                print(f"  +{k}: {lines[i+k].strip()}")
