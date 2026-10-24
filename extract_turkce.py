with open("line_2717_full.txt", "r", encoding="utf-8") as f:
    text = f.read()

pos = text.find("Oyun Dünyası")
print("pos in line_2717:", pos)
if pos != -1:
    turkce_text = text[pos-50:]
    with open("turkce_transcription_from_summary.txt", "w", encoding="utf-8") as out:
        out.write(turkce_text)
    print("Saved turkce_transcription_from_summary.txt, len:", len(turkce_text))
