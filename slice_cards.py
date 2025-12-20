from PIL import Image
import os

# Ensure output directory exists
output_dir = "public/cards"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Load the sprite sheet
sprite_path = "public/face-cards-sprite.png"
try:
    img = Image.open(sprite_path)
    width, height = img.size
    
    # Grid dimensions
    cols = 3 # J, Q, K
    rows = 4 # Spades, Hearts, Clubs, Diamonds
    
    card_width = width / cols
    card_height = height / rows
    
    ranks = ['jack', 'queen', 'king']
    suits = ['spades', 'hearts', 'clubs', 'diamonds']
    
    print(f"Slicing {sprite_path} ({width}x{height}) into {rows}x{cols} grid...")
    
    for r, suit in enumerate(suits):
        for c, rank in enumerate(ranks):
            left = c * card_width
            top = r * card_height
            right = left + card_width
            bottom = top + card_height
            
            # Crop
            card_img = img.crop((left, top, right, bottom))
            
            # Save
            filename = f"{suit}-{rank}.png"
            save_path = os.path.join(output_dir, filename)
            card_img.save(save_path)
            print(f"Saved {save_path}")
            
    print("Done!")

except Exception as e:
    print(f"Error: {e}")
