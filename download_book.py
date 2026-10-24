import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
import img2pdf

BOOK_ID = 72747
TOTAL_PAGES = 257
OUTPUT_PDF = "Yargi_Ders_Arkadasim_Matematik_72747.pdf"
TEMP_DIR = "temp_pages"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_and_decrypt_page(page_num):
    url = f"https://yayin.yargidersarkadasim.com/Uploads/WebDijitapDosyalar/{BOOK_ID}/pages/{page_num}.png"
    out_file = os.path.join(TEMP_DIR, f"{page_num:04d}.png")
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = bytearray(resp.read())
            
            # XOR / complement first 100 bytes
            for i in range(min(100, len(data))):
                data[i] = (256 - data[i]) % 256
                
            with open(out_file, "wb") as f:
                f.write(data)
            return page_num, True, None
        except Exception as e:
            if attempt == 2:
                return page_num, False, str(e)
            time.sleep(1)

def main():
    start_time = time.time()
    os.makedirs(TEMP_DIR, exist_ok=True)
    print(f"[{BOOK_ID}] Toplam {TOTAL_PAGES} sayfa indiriliyor...")

    completed = 0
    errors = []
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_and_decrypt_page, p): p for p in range(1, TOTAL_PAGES + 1)}
        for future in as_completed(futures):
            p_num, success, err = future.result()
            completed += 1
            if not success:
                errors.append((p_num, err))
                print(f"Sayfa {p_num} indirilemedi: {err}")
            if completed % 25 == 0 or completed == TOTAL_PAGES:
                print(f"İlerleme: {completed}/{TOTAL_PAGES} (%{completed*100//TOTAL_PAGES})")

    if errors:
        print(f"HATA: {len(errors)} sayfa indirilemedi!")
        return

    print("Tüm sayfalar indirildi ve şifreleri çözüldü.")
    print("PDF oluşturuluyor...")
    
    image_files = [os.path.join(TEMP_DIR, f"{p:04d}.png") for p in range(1, TOTAL_PAGES + 1)]
    with open(OUTPUT_PDF, "wb") as f:
        f.write(img2pdf.convert(image_files))

    pdf_size_mb = os.path.getsize(OUTPUT_PDF) / (1024 * 1024)
    print(f"PDF başarıyla kaydedildi: {OUTPUT_PDF} ({pdf_size_mb:.2f} MB)")

    # Temizlik
    for img in image_files:
        try:
            os.remove(img)
        except OSError:
            pass
    try:
        os.rmdir(TEMP_DIR)
    except OSError:
        pass

    elapsed = time.time() - start_time
    print(f"İşlem tamamlandı! Toplam süre: {elapsed:.1f} saniye.")

if __name__ == "__main__":
    main()
