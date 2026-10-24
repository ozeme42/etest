with open("build_and_upload_bumerang.py", "r", encoding="utf-8") as f:
    text = f.read()

turkce_part = text[text.find("def build_turkce_book"):]
themes = turkce_part.split('"id": "top_turkce_t')
for t in themes[1:]:
    lines = t.splitlines()
    t_name = lines[0].strip()
    tests = [l.strip().split(",")[0] for l in lines if 'Test' in l]
    print(t_name[:40], "->", len(tests), "tests:", tests)
