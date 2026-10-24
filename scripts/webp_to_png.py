import os
import sys
from PIL import Image

def webp_to_png(webp_path, png_path):
    im = Image.open(webp_path)
    im.save(png_path, 'PNG')

if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2]
    webp_to_png(src, dst)
    print(f"Converted {src} to {dst}")
