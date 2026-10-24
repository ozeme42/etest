with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "Yazılıya Hazırlık" in l:
        print(f"Line {i+1}: {repr(l)}")
        for k in range(1, 10):
            if i+k < len(lines):
                print(f"  +{k}: {repr(lines[i+k])}")
