with open("build_and_upload_bumerang.py", "r", encoding="utf-8") as f:
    text = f.read()

turkce_part = text[text.find("def build_turkce_book"):]
themes = turkce_part.split('"id": "top_turkce_t')
for i, t in enumerate(themes[1:], 1):
    tests = [l.strip().split(",")[0].strip('("') for l in t.splitlines() if 'Test' in l or 'Bağlam' in l or 'Baglam' in l]
    print(f"Tema {i} tests ({len(tests)}):", tests)
