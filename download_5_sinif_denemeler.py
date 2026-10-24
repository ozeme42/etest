import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import img2pdf

# AES Decryption constants
DEFAULT_KEY = '1l0O1l0O1l0O1l0O1l0O1l0O1l0O1l0O'
FERNUS_CODE = '3_3_6'
BOOK_KEY = (FERNUS_CODE + DEFAULT_KEY[:32 - len(FERNUS_CODE)]).encode('utf-8')
IV = b'kxk101l0O1l0O1l0'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

BOOKS = [
    {
        "title": "5. Sınıf Türkçe Haftalık Deneme V25",
        "base_url": "http://hizliogretmen.com/bookszkitapx/2024-5-sinif-turkce-haftalik-deneme/",
        "pages": 296,
        "output": "5_Sinif_Turkce_Haftalik_Deneme_V25.pdf"
    },
    {
        "title": "5. Sınıf Matematik Haftalık Deneme V25",
        "base_url": "http://hizliogretmen.com/bookszkitapx/2024-5-sinif-matematik-haftalik-deneme/",
        "pages": 304,
        "output": "5_Sinif_Matematik_Haftalik_Deneme_V25.pdf"
    },
    {
        "title": "5. Sınıf Fen Bilimleri Haftalık Deneme V25",
        "base_url": "http://hizliogretmen.com/bookszkitapx/2024-5-sinif-fen-bilimleri-haftalik-deneme/",
        "pages": 304,
        "output": "5_Sinif_Fen_Bilimleri_Haftalik_Deneme_V25.pdf"
    },
    {
        "title": "5. Sınıf Sosyal Bilgiler Haftalık Deneme V25",
        "base_url": "http://hizliogretmen.com/bookszkitapx/2024-5-sinif-sosyal-bilgiler-haftalik-deneme/",
        "pages": 152,
        "output": "5_Sinif_Sosyal_Bilgiler_Haftalik_Deneme_V25.pdf"
    }
]

def download_and_decrypt_page(base_url, page_num, temp_dir):
    url = f"{base_url}p-{page_num}.webp"
    out_file = os.path.join(temp_dir, f"{page_num:04d}.webp")

    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=25) as resp:
                raw_data = resp.read()

            cipher = AES.new(BOOK_KEY, AES.MODE_CBC, IV)
            decrypted_webp = unpad(cipher.decrypt(raw_data), AES.block_size)

            with open(out_file, "wb") as f:
                f.write(decrypted_webp)
            return page_num, True, None
        except Exception as e:
            if attempt == 3:
                return page_num, False, str(e)
            time.sleep(1)

def process_book(book_info, book_index, total_books):
    title = book_info["title"]
    base_url = book_info["base_url"]
    total_pages = book_info["pages"]
    output_pdf = book_info["output"]
    temp_dir = f"temp_pages_{book_index}"

    print(f"\n==================================================", flush=True)
    print(f"[{book_index}/{total_books}] {title}", flush=True)
    print(f"Toplam sayfa: {total_pages} | Hedef: {output_pdf}", flush=True)
    print(f"==================================================", flush=True)

    start_time = time.time()
    os.makedirs(temp_dir, exist_ok=True)

    completed = 0
    errors = []

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(download_and_decrypt_page, base_url, p, temp_dir): p for p in range(1, total_pages + 1)}
        for future in as_completed(futures):
            p_num, success, err = future.result()
            completed += 1
            if not success:
                errors.append((p_num, err))
                print(f"Hata: Sayfa {p_num} indirilemedi: {err}", flush=True)
            if completed % 50 == 0 or completed == total_pages:
                print(f"İlerleme: {completed}/{total_pages} (%{completed * 100 // total_pages})", flush=True)

    if errors:
        print(f"UYARI: {len(errors)} sayfada hata olustu, PDF olusturulamadi!", flush=True)
        return False

    print("Sayfalar indirildi ve sifreleri cozuldu. PDF olusturuluyor...", flush=True)
    page_files = [os.path.join(temp_dir, f"{p:04d}.webp") for p in range(1, total_pages + 1)]

    with open(output_pdf, "wb") as f:
        f.write(img2pdf.convert(page_files))

    size_mb = os.path.getsize(output_pdf) / (1024 * 1024)
    elapsed = time.time() - start_time
    print(f"TAMAMLANDI: {output_pdf} ({size_mb:.2f} MB, {elapsed:.1f} saniye)", flush=True)

    # Temizlik
    for pf in page_files:
        try:
            os.remove(pf)
        except OSError:
            pass
    try:
        os.rmdir(temp_dir)
    except OSError:
        pass

    return True

def main():
    total_start = time.time()
    total_books = len(BOOKS)
    success_count = 0

    print(f"Toplu Indirme Basliyor: Toplam {total_books} Kitap", flush=True)

    for idx, b in enumerate(BOOKS, start=1):
        if process_book(b, idx, total_books):
            success_count += 1

    total_elapsed = time.time() - total_start
    print(f"\n==================================================", flush=True)
    print(f"TUM ISLEMLER TAMAMLANDI! {success_count}/{total_books} kitap basariyla kaydedildi.", flush=True)
    print(f"Toplam sure: {total_elapsed / 60:.1f} dakika.", flush=True)
    print(f"==================================================", flush=True)

if __name__ == "__main__":
    main()
