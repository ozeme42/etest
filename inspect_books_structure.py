import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== FEN BOOK CONTENTS ===")
with open('fen_book.json', 'r', encoding='utf-8') as f:
    fb = json.load(f)

for i, item in enumerate(fb.get('bookContents', [])):
    title = item.get('title')
    pno = item.get('pageNumber')
    children = item.get('children', [])
    print(f"[{i}] {title} (p.{pno})")
    for j, c in enumerate(children):
        c_title = c.get('title')
        c_pno = c.get('pageNumber')
        print(f"    [{i}.{j}] {c_title} (p.{c_pno})")

print("\n=== TURKCE BOOK CONTENTS ===")
with open('turkce_book.json', 'r', encoding='utf-8') as f:
    tb = json.load(f)

for i, item in enumerate(tb.get('bookContents', [])):
    title = item.get('title')
    pno = item.get('pageNumber')
    children = item.get('children', [])
    print(f"[{i}] {title} (p.{pno})")
    for j, c in enumerate(children):
        c_title = c.get('title')
        c_pno = c.get('pageNumber')
        print(f"    [{i}.{j}] {c_title} (p.{c_pno})")
