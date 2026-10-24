import re

with open('build_and_upload_bumerang.py', 'r', encoding='utf-8') as f:
    text = f.read()

for match in re.finditer(r'def (build_\w+)', text):
    func_name = match.group(1)
    print("=" * 40, func_name, "=" * 40)
    func_text = text[match.start():]
    next_func = re.search(r'\ndef build_', func_text[1:])
    if next_func:
        func_text = func_text[:next_func.start()+1]
    
    # count tests
    oe_matches = re.findall(r'"(yaziliya_hazirlik|etkinlikler)":\s*\{([^}]+)\}', func_text)
    for name, content in oe_matches:
        q_count = len(re.findall(r'\d+:', content))
        print(f"  {name}: {q_count} questions")
