import re
import json

with open("fen_transcriptions_complete.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

# We will collect into dictionaries
fen_dicts = {}

current_dict_name = None

# We know the exact sections in order:
# Unit 1:
# - 1. Bölüm (Güneş): Etk 1–15 -> FEN_U1_B1_ETK
# - 2. Bölüm (Ay): Etk 1–21 -> FEN_U1_B2_ETK
# - 3. Bölüm (Dünya...): Etk 1–12 -> FEN_U1_B3_ETK
# - Yazılıya Hazırlık: Soru 1–8 -> FEN_U1_YAZILI
# Unit 2:
# - 1. Bölüm (Kuvvet...): Etk 1–10 -> FEN_U2_B1_ETK
# - 2. Bölüm (Kütle...): Etk 1–9 -> FEN_U2_B2_ETK
# - 3. Bölüm (Sürtünme...): Etk 1–8 -> FEN_U2_B3_ETK
# - Yazılıya Hazırlık: Soru 1–4 -> FEN_U2_YAZILI
# Unit 3:
# - Hatırlayalım -> FEN_U3_HATIRLAYALIM
# - 1. Bölüm (Hücre...): Etk 1–8 -> FEN_U3_B1_ETK
# - 2. Bölüm (Destek...): Etk 1–9 -> FEN_U3_B2_ETK
# - Yazılıya Hazırlık: Soru 1–5 -> FEN_U3_YAZILI
# Unit 4:
# - 1. Bölüm (Işığın...): Etk 1–7 -> FEN_U4_B1_ETK
# - 2. Bölüm (Madde...): Etk 1–9 -> FEN_U4_B2_ETK
# - 3. Bölüm (Tam Gölge...): Etk 1–14 -> FEN_U4_B3_ETK
# - Yazılıya Hazırlık: Soru 1–5 -> FEN_U4_YAZILI
# Unit 5:
# - Hatırlayalım -> FEN_U5_HATIRLAYALIM
# - 1. Bölüm (Maddenin...): Etk 1–11 -> FEN_U5_B1_ETK
# - 2. Bölüm (Isı...): Etk 1–8 -> FEN_U5_B2_ETK
# - 3. Bölüm (Maddenin Hâl...): Etk 1–8 -> FEN_U5_B3_ETK
# - 4. Bölüm (Madde ve Isı...): Etk 1–4 -> FEN_U5_B4_ETK
# - Yazılıya Hazırlık: Soru 1–6 -> FEN_U5_YAZILI
# Unit 6:
# - Hatırlayalım -> FEN_U6_HATIRLAYALIM
# - 1. Bölüm (Devre...): Etk 1–7 -> FEN_U6_B1_ETK
# - 2. Bölüm (Basit Elektrik...): Etk 1–4 -> FEN_U6_B2_ETK
# - Yazılıya Hazırlık: Soru 1–6 -> FEN_U6_YAZILI
# Unit 7:
# - Hatırlayalım -> FEN_U7_HATIRLAYALIM
# - 1. Bölüm (Evsel...): Etk 1–4 -> FEN_U7_B1_ETK
# - Yazılıya Hazırlık: Soru 1–5 -> FEN_U7_YAZILI

current_unit = 1

for line in lines:
    line_s = line.strip()
    if not line_s:
        continue
    
    # check unit switch
    m_u = re.search(r'Ünite (\d)', line_s)
    if m_u:
        current_unit = int(m_u.group(1))
    
    if "Hatırlayalım" in line_s:
        current_dict_name = f"FEN_U{current_unit}_HATIRLAYALIM"
        fen_dicts[current_dict_name] = {}
        # parse the Hatırlayalım items
        m_h1 = re.search(r'Etk 1\s*\(([^)]+)\)', line_s)
        m_h2 = re.search(r'Etk 2\s*\(([^)]+)\)', line_s)
        if m_h1:
            fen_dicts[current_dict_name][1] = m_h1.group(1).strip()
        if m_h2:
            fen_dicts[current_dict_name][2] = m_h2.group(1).strip()
        continue
    
    m_bolum = re.search(r'(\d+)\.\s*Bölüm', line_s)
    if m_bolum:
        b_num = int(m_bolum.group(1))
        current_dict_name = f"FEN_U{current_unit}_B{b_num}_ETK"
        fen_dicts[current_dict_name] = {}
        continue
        
    if "Yazılıya Hazırlık" in line_s:
        current_dict_name = f"FEN_U{current_unit}_YAZILI"
        fen_dicts[current_dict_name] = {}
        continue
        
    m_item = re.match(r'-\s*(?:Etk\s*)?(\d+):\s*(.*)', line_s)
    if m_item and current_dict_name:
        q_no = int(m_item.group(1))
        ans = m_item.group(2).strip()
        fen_dicts[current_dict_name][q_no] = ans

print(f"Total parsed dicts: {len(fen_dicts)}")
for name, d in fen_dicts.items():
    print(f"{name}: {len(d)} questions (keys {min(d.keys()) if d else None}..{max(d.keys()) if d else None})")

# Write out bumerang_fen_answers.py
with open("bumerang_fen_answers.py", "w", encoding="utf-8") as f:
    f.write("# -*- coding: utf-8 -*-\n")
    f.write('"""\nAuthentic Open-Ended Answer Keys for 5. Sınıf Bumerang Fen Bilimleri\nTranscribed verbatim from printed teacher answer keys (pages 344-356).\n"""\n\n')
    
    for name, d in fen_dicts.items():
        f.write(f"{name} = {{\n")
        for q_no in sorted(d.keys()):
            val = d[q_no].replace('\\', '\\\\').replace('"', '\\"')
            f.write(f'    {q_no}: "{val}",\n')
        f.write("}\n\n")

print("Generated bumerang_fen_answers.py successfully!")
