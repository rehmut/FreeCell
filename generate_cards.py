from PIL import Image, ImageDraw, ImageFont, ImageColor
from functools import lru_cache
import os
import re

# Configuration
OUTPUT_DIR = "public/cards"
SPRITE_PATH = "C:/Users/Lenovo/.gemini/antigravity/brain/955732e4-9248-4fbf-8a80-9fce95cf0e2a/face_cards_sprite_1763929357915.png"
WIDTH = 400  # Doubled from 200
HEIGHT = 560 # Doubled from 280
BG_COLOR = "white"
RED_COLOR = "#d32f2f"
BLACK_COLOR = "#212121"
HEADER_HEIGHT = 170
HEADER_COLOR = "#f5f5f5"
CONTENT_MARGIN = 24

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Suits and Ranks
SUITS = {
    'spades': {
        'color': BLACK_COLOR,
        'row': 0,
        'path': "M50,10 C50,10 95,40 95,75 C95,95 80,105 60,95 L65,125 L35,125 L40,95 C20,105 5,95 5,75 C5,40 50,10 50,10 Z"
    },
    'hearts': {
        'color': RED_COLOR,
        'row': 1,
        'path': "M50,30 C50,30 90,0 95,35 C98,55 50,95 50,95 C50,95 2,55 5,35 C10,0 50,30 50,30 Z"
    },
    'clubs': {
        'color': BLACK_COLOR,
        'row': 2,
        'path': "M50,20 C65,20 75,30 75,45 C75,55 65,65 55,65 C65,60 85,60 90,75 C95,90 80,105 60,95 L65,125 L35,125 L40,95 C20,105 5,90 10,75 C15,60 35,60 45,65 C35,65 25,55 25,45 C25,30 35,20 50,20 Z"
    },
    'diamonds': {
        'color': RED_COLOR,
        'row': 3,
        'path': "M50,10 L90,65 L50,120 L10,65 Z"
    }
}

RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
FACE_RANK_INDICES = {'J': 0, 'Q': 1, 'K': 2}
PIP_SIZE = int(WIDTH * 0.22)
HEADER_SUIT_RATIO = 0.6
ACE_SYMBOL_RATIO = 0.58
SUIT_VIEWBOX_WIDTH = 100
SUIT_VIEWBOX_HEIGHT = 130


def parse_path_points(path_d, samples_per_curve=20):
    tokens = re.findall(r"[A-Za-z]|-?\d+(?:\.\d+)?", path_d)
    polygons = []
    current_poly = []
    current_pos = (0.0, 0.0)
    i = 0

    def add_point(pt):
        nonlocal current_poly
        if not current_poly:
            current_poly = [pt]
        else:
            current_poly.append(pt)

    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        if cmd.upper() == 'M':
            x = float(tokens[i]); y = float(tokens[i + 1]); i += 2
            if current_poly:
                polygons.append(current_poly)
            current_poly = [(x, y)]
            current_pos = (x, y)
        elif cmd.upper() == 'L':
            x = float(tokens[i]); y = float(tokens[i + 1]); i += 2
            add_point((x, y))
            current_pos = (x, y)
        elif cmd.upper() == 'C':
            x1 = float(tokens[i]); y1 = float(tokens[i + 1])
            x2 = float(tokens[i + 2]); y2 = float(tokens[i + 3])
            x3 = float(tokens[i + 4]); y3 = float(tokens[i + 5])
            i += 6
            x0, y0 = current_pos
            for step in range(1, samples_per_curve + 1):
                t = step / samples_per_curve
                mt = 1 - t
                x = (mt ** 3) * x0 + 3 * (mt ** 2) * t * x1 + 3 * mt * (t ** 2) * x2 + (t ** 3) * x3
                y = (mt ** 3) * y0 + 3 * (mt ** 2) * t * y1 + 3 * mt * (t ** 2) * y2 + (t ** 3) * y3
                add_point((x, y))
            current_pos = (x3, y3)
        elif cmd.upper() == 'Z':
            if current_poly:
                polygons.append(current_poly)
                current_poly = []
        else:
            raise ValueError(f"Unsupported path command {cmd} in {path_d}")

    if current_poly:
        polygons.append(current_poly)

    return polygons


@lru_cache(maxsize=None)
def get_suit_polygons(suit_name):
    path = SUITS[suit_name]['path']
    return parse_path_points(path)


@lru_cache(maxsize=None)
def get_suit_mask(suit_name, size):
    polygons = get_suit_polygons(suit_name)
    size = max(int(size), 1)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    scale = size / max(SUIT_VIEWBOX_WIDTH, SUIT_VIEWBOX_HEIGHT)
    offset_x = (size - SUIT_VIEWBOX_WIDTH * scale) / 2
    offset_y = (size - SUIT_VIEWBOX_HEIGHT * scale) / 2

    for points in polygons:
        scaled = [(offset_x + x * scale, offset_y + y * scale) for x, y in points]
        draw.polygon(scaled, fill=255)

    return mask


def get_suit_image(suit_name, size, color, rotate=False):
    mask = get_suit_mask(suit_name, size)
    rgb = ImageColor.getrgb(color)
    symbol = Image.new('RGBA', mask.size, (*rgb, 0))
    symbol.putalpha(mask)
    if rotate:
        symbol = symbol.rotate(180, resample=Image.Resampling.BICUBIC)
    return symbol


def paste_suit_symbol(target_img, suit_name, center_x, center_y, size, color, rotate=False):
    size = max(int(size), 1)
    symbol = get_suit_image(suit_name, size, color, rotate)
    offset = (int(center_x - symbol.width / 2), int(center_y - symbol.height / 2))
    target_img.paste(symbol, offset, symbol)

# Load Sprite Sheet
try:
    sprite_sheet = Image.open(SPRITE_PATH)
    sprite_w, sprite_h = sprite_sheet.size
    face_w = sprite_w / 3
    face_h = sprite_h / 4
    print(f"Loaded sprite sheet: {sprite_w}x{sprite_h}. Face size: {face_w}x{face_h}")
except Exception as e:
    print(f"Error loading sprite sheet: {e}")
    sprite_sheet = None

def draw_card(rank, suit_name):
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    suit_info = SUITS[suit_name]
    color = suit_info['color']
    
    # Load fonts (Doubled sizes)
    try:
        # Large rank for the header band
        font_rank_header = ImageFont.truetype("arialbd.ttf", 140)
    except:
        # Fallback if system fonts fail
        font_rank_header = ImageFont.load_default()

    # --- Header Bands (filled sections for stacked readability) ---
    def text_size(draw_ctx, text, font):
        bbox = draw_ctx.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    rank_w, rank_h = text_size(draw, rank, font_rank_header)
    suit_size = int(HEADER_HEIGHT * HEADER_SUIT_RATIO)

    header_img = Image.new('RGBA', (WIDTH, HEADER_HEIGHT), (0, 0, 0, 0))
    header_draw = ImageDraw.Draw(header_img)
    header_draw.rectangle([0, 0, WIDTH, HEADER_HEIGHT], fill=HEADER_COLOR)
    padding = 24
    rank_y = (HEADER_HEIGHT - rank_h) / 2
    header_draw.text((padding, rank_y), rank, font=font_rank_header, fill=color)
    suit_center_x = WIDTH - padding - suit_size / 2
    suit_center_y = HEADER_HEIGHT / 2
    paste_suit_symbol(header_img, suit_name, suit_center_x, suit_center_y, suit_size, color)
    img.paste(header_img, (0, 0), header_img)

    content_top = HEADER_HEIGHT + CONTENT_MARGIN
    content_bottom = HEIGHT - CONTENT_MARGIN
    content_height = content_bottom - content_top

    def content_y(ratio: float) -> float:
        """Map 0..1 positions into the vertical safe zone."""
        return content_top + ratio * content_height

    # --- Center Content ---

    if rank in ['J', 'Q', 'K'] and sprite_sheet:
        # Face Cards: Crop from sprite
        row = suit_info['row']
        col = FACE_RANK_INDICES[rank]
        
        left = col * face_w
        top = row * face_h
        right = left + face_w
        bottom = top + face_h
        
        face_img = sprite_sheet.crop((left, top, right, bottom))
        
        # Resize to fit inside card (leaving space for headers)
        target_w = int(WIDTH * 0.7)
        target_h = min(int(content_height * 0.9), int(HEIGHT * 0.65))
        face_img = face_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Center paste
        paste_x = int((WIDTH - target_w) / 2)
        paste_y = int(content_top + (content_height - target_h) / 2)
        img.paste(face_img, (paste_x, paste_y))
        
        # Border
        draw.rectangle([paste_x, paste_y, paste_x + target_w, paste_y + target_h], outline=color, width=2)
        
    elif rank == 'A':
        ace_size = int(min(WIDTH * ACE_SYMBOL_RATIO, content_height * 0.85))
        paste_suit_symbol(img, suit_name, WIDTH / 2, content_top + content_height / 2, ace_size, color)
        
    else:
        # Number Cards: Pips (Standard Layout)
        r_val = int(rank)
        
        # Grid positions
        col1, col2, col3 = WIDTH * 0.25, WIDTH * 0.5, WIDTH * 0.75
        row1 = content_y(0.05)
        row2 = content_y(0.25)
        row3 = content_y(0.5)
        row4 = content_y(0.75)
        row5 = content_y(0.95)
        
        pips = []
        
        if r_val in [2, 3]:
            pips.append((col2, row1))
            pips.append((col2, row5, True))
        if r_val == 3:
            pips.append((col2, row3))
            
        if r_val in [4, 5, 6, 7, 8, 9, 10]:
            pips.append((col1, row1))
            pips.append((col3, row1))
            pips.append((col1, row5, True))
            pips.append((col3, row5, True))
            
        if r_val in [6, 7, 8]:
            pips.append((col1, row3))
            pips.append((col3, row3))
            
        if r_val in [7, 8]:
            pips.append((col2, content_y(0.35)))
            
        if r_val == 8:
            pips.append((col2, content_y(0.65), True))
            
        if r_val in [9, 10]:
            pips.append((col1, content_y(0.38)))
            pips.append((col3, content_y(0.38)))
            pips.append((col1, content_y(0.62), True))
            pips.append((col3, content_y(0.62), True))
            
        if r_val == 10:
            pips.append((col2, content_y(0.25)))
            pips.append((col2, content_y(0.75), True))
            
        if r_val == 5:
            pips.append((col2, row3))
            
        if r_val == 9:
             pips.append((col2, row3))

        pip_symbol_size = int(min(PIP_SIZE, content_height * 0.25))

        for item in pips:
            px, py = item[0], item[1]
            inverted = len(item) > 2 and item[2]
            paste_suit_symbol(img, suit_name, px, py, pip_symbol_size, color, rotate=inverted)

    # Save
    rank_filename = rank
    if rank == 'J': rank_filename = 'jack'
    if rank == 'Q': rank_filename = 'queen'
    if rank == 'K': rank_filename = 'king'
    
    save_path = os.path.join(OUTPUT_DIR, f"{suit_name}-{rank_filename}.png")
    img.save(save_path)
    print(f"Generated {save_path}")

# Generate all
for suit in SUITS:
    for rank in RANKS:
        draw_card(rank, suit)

print("All cards generated.")
