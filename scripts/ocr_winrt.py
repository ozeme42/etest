import asyncio
import sys
import os
import winrt.windows.media.ocr as ocr
import winrt.windows.graphics.imaging as imaging
import winrt.windows.storage as storage
import winrt.windows.globalization as glob

async def run_ocr(image_path):
    abs_path = os.path.abspath(image_path)
    file = await storage.StorageFile.get_file_from_path_async(abs_path)
    stream = await file.open_async(storage.FileAccessMode.READ)
    decoder = await imaging.BitmapDecoder.create_async(stream)
    bitmap = await decoder.get_software_bitmap_async()
    
    lang = glob.Language("tr")
    engine = ocr.OcrEngine.try_create_from_language(lang)
    if not engine:
        engine = ocr.OcrEngine.try_create_from_user_profile_languages()
        
    result = await engine.recognize_async(bitmap)
    lines = [line.text for line in result.lines]
    return "\n".join(lines)

if __name__ == '__main__':
    img_path = sys.argv[1]
    text = asyncio.run(run_ocr(img_path))
    print(text)
