import re

with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

current_sec = None
sections = {}

for line in lines:
    line_s = line.strip()
    if not line_s:
        continue
    
    # check for section header
    # e.g. - 1. Bölüm (Güneş): Etk 1–15
    # or - Yazılıya Hazırlık: Soru 1–8
    # or - Hatırlayalım: Etk 1 (...)
    m_sec = re.match(r'-\s*(\d+\.\s*Bölüm[^\n:]+|Hatırlayalım[^\n:]+|Yazılıya Hazırlık[^\n:]+):?', line_s)
    if m_sec:
        current_sec = m_sec.group(1).strip()
        sections[current_sec] = {}
        # if Hatırlayalım has content on the same line
        if "Hatırlayalım" in current_sec:
            m_h1 = re.search(r'Etk 1\s*\(([^)]+)\)', line_s)
            m_h2 = re.search(r'Etk 2\s*\(([^)]+)\)', line_s)
            if m_h1:
                sections[current_sec][1] = m_h1.group(1).strip()
            if m_h2:
                sections[current_sec][2] = m_h2.group(1).strip()
        continue
    
    # check for activity/question item
    # e.g. - Etk 1: ...
    # or - 1: ...
    m_item = re.match(r'-\s*(?:Etk\s*)?(\d+):\s*(.*)', line_s)
    if m_item and current_sec:
        q_no = int(m_item.group(1))
        ans = m_item.group(2).strip()
        sections[current_sec][q_no] = ans
    elif current_sec and line_s.startswith("-") and not line_s.startswith("- **"):
        # might be continuation or other format
        pass

print(f"Total parsed sections: {len(sections)}")
for s, qs in sections.items():
    print(f"[{s}] -> {len(qs)} questions (keys: {min(qs.keys()) if qs else None}..{max(qs.keys()) if qs else None})")
