import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw
    
    # Render a clean PNG favicon using PIL
    img_size = 512
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw dark rounded square
    # PIL draw rounded rect
    draw.rounded_rectangle([16, 16, 496, 496], radius=108, fill=(15, 23, 42, 255), outline=(255, 255, 255, 40), width=6)
    
    # Draw grid lines
    for y in [160, 256, 352]:
        draw.line([(80, y), (432, y)], fill=(255, 255, 255, 18), width=3)
        
    # Draw stock trend line
    points = [(80, 360), (160, 310), (240, 340), (340, 210), (420, 120)]
    draw.line(points, fill=(34, 197, 94, 255), width=28, joint="curve")
    
    # Draw bullseye target
    cx, cy = 420, 120
    draw.ellipse([cx - 48, cy - 48, cx + 48, cy + 48], outline=(245, 158, 11, 255), width=12)
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(239, 68, 68, 255))
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 255, 255, 255))
    
    img.save("d:/Code/Consensus/favicon.png", "PNG")
    
    # Also save 32x32 ico / png
    img32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    img32.save("d:/Code/Consensus/favicon.ico", format="ICO")
    print("Successfully created favicon.png and favicon.ico!")
except Exception as e:
    print(f"PIL error: {e}")
