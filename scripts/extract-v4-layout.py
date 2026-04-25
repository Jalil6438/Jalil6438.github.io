"""
One-shot extractor: turns the QUL V4-tajweed downloads into our app's JSON
shape so we can A/B the layout against V2.

Inputs (in public/):
  - pages.zip                       (604 .docx files, one per page)
  - qpc-v4-tajweed-15-lines.db      (SQLite layout)

Outputs (in public/v4/):
  - mushaf-pages.json
  - mushaf-layout.json
  - verse-to-page.json

Run:
  python scripts/extract-v4-layout.py
"""
import json, os, re, sqlite3, sys, zipfile, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB  = os.path.join(ROOT, "public")
OUT  = os.path.join(PUB, "v4")
os.makedirs(OUT, exist_ok=True)

# 1) pages.zip -> mushaf-pages.json (per-page list of ayah-row glyph strings)
print("Extracting pages.zip -> mushaf-pages.json ...")
pages_out = {}
with zipfile.ZipFile(os.path.join(PUB, "pages.zip")) as z:
    for n in range(1, 605):
        name = f"{n}.docx"
        try:
            with z.open(name) as f:
                buf = f.read()
        except KeyError:
            print(f"  ! missing {name}")
            continue
        with zipfile.ZipFile(io.BytesIO(buf)) as docz:
            with docz.open("word/document.xml") as df:
                xml = df.read().decode("utf-8")
        runs = re.findall(r"<w:t[^>]*>([^<]+)</w:t>", xml)
        pages_out[str(n)] = runs
print(f"  wrote {len(pages_out)} pages")

with open(os.path.join(OUT, "mushaf-pages.json"), "w", encoding="utf-8") as f:
    json.dump(pages_out, f, ensure_ascii=False, separators=(",", ":"))

# 2) layout DB -> mushaf-layout.json
# Schema: pages(page_number,line_number,line_type,is_centered,first_word_id,last_word_id,surah_number)
print("Extracting layout DB -> mushaf-layout.json ...")
layout_out = {}
con = sqlite3.connect(os.path.join(PUB, "qpc-v4-tajweed-15-lines.db"))
cur = con.cursor()
cur.execute("""
  SELECT page_number,line_number,line_type,is_centered,first_word_id,last_word_id,surah_number
  FROM pages ORDER BY page_number, line_number
""")
for pn, ln, lt, cen, fw, lw, sn in cur.fetchall():
    layout_out.setdefault(str(pn), []).append({
        "ln": ln, "type": lt, "center": cen,
        "fw": fw if fw != "" else "",
        "lw": lw if lw != "" else "",
        "sn": sn if sn != "" else "",
    })
con.close()
print(f"  wrote {len(layout_out)} pages of layout entries")

with open(os.path.join(OUT, "mushaf-layout.json"), "w", encoding="utf-8") as f:
    json.dump(layout_out, f, ensure_ascii=False, separators=(",", ":"))

# 3) verse-to-page.json — derive from layout's first_word_id / last_word_id
# We need word_id -> verse_key. The v2 db doesn't have a words table either,
# so the v2 verse-to-page.json must have been generated from somewhere else
# (likely quran.com's word data). For now, copy the v2 file — page numbering
# matches across both layouts (standard 604-page Madinah).
print("Copying v2 verse-to-page.json (page numbering identical) ...")
with open(os.path.join(PUB, "verse-to-page.json"), encoding="utf-8") as f:
    v2p = f.read()
with open(os.path.join(OUT, "verse-to-page.json"), "w", encoding="utf-8") as f:
    f.write(v2p)

print("\nDone. Output:", OUT)
