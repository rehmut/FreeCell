from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 400, 560
CORNER_HEIGHT = 120
CORNER_WIDTH = 138
CENTER_MARGIN_X = 80
MARGIN = 12


def main():
    img = Image.new('RGB', (WIDTH, HEIGHT), '#fdfdfd')
    draw = ImageDraw.Draw(img)

    # Card outline
    draw.rounded_rectangle([4, 4, WIDTH - 4, HEIGHT - 4], radius=24, outline='#37474f', width=4)

    center_box = (CENTER_MARGIN_X, CORNER_HEIGHT + 10, WIDTH - CENTER_MARGIN_X, HEIGHT - CORNER_HEIGHT - 10)
    corner_boxes = {
        'top_left': (MARGIN, MARGIN, MARGIN + CORNER_WIDTH, MARGIN + CORNER_HEIGHT),
        'top_right': (WIDTH - MARGIN - CORNER_WIDTH, MARGIN, WIDTH - MARGIN, MARGIN + CORNER_HEIGHT),
        'bottom_left': (MARGIN, HEIGHT - MARGIN - CORNER_HEIGHT, MARGIN + CORNER_WIDTH, HEIGHT - MARGIN),
        'bottom_right': (WIDTH - MARGIN - CORNER_WIDTH, HEIGHT - MARGIN - CORNER_HEIGHT, WIDTH - MARGIN, HEIGHT - MARGIN),
    }

    # Color areas
    draw.rounded_rectangle(center_box, radius=16, fill='#fff8e1', outline='#90a4ae', width=2)
    for box in corner_boxes.values():
        draw.rounded_rectangle(box, radius=16, fill='#e3f2fd', outline='#90a4ae', width=2)

    try:
        font_title = ImageFont.truetype('arialbd.ttf', 28)
        font_corner = ImageFont.truetype('arial.ttf', 18)
        font_note = ImageFont.truetype('arial.ttf', 16)
    except OSError:
        font_title = ImageFont.load_default()
        font_corner = ImageFont.load_default()
        font_note = ImageFont.load_default()

    # Corner labels
    for box_name, box in corner_boxes.items():
        x0, y0, _, _ = box
        draw.multiline_text(
            (x0 + 10, y0 + 10),
            'Rank\n+ Suit',
            font=font_corner,
            fill='#1b5e20'
        )

    center_text = 'Art safe zone\n(keep faces/pips here)'
    bbox = draw.multiline_textbbox((0, 0), center_text, font=font_title, align='center')
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (WIDTH - text_w) / 2
    text_y = (center_box[1] + center_box[3] - text_h) / 2
    draw.multiline_text((text_x, text_y), center_text, font=font_title, fill='#bf360c', align='center')

    footer = 'Leave ~12px padding so stacked cards stay readable.'
    footer_bbox = draw.textbbox((0, 0), footer, font=font_note)
    draw.text(((WIDTH - (footer_bbox[2] - footer_bbox[0])) / 2, HEIGHT - CORNER_HEIGHT - 30), footer, font=font_note, fill='#546e7a')

    output = 'public/cards/freecell-mockup.png'
    img.save(output)
    print(f'Mockup saved to {output}')


if __name__ == '__main__':
    main()
