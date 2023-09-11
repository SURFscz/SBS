import base64
from io import BytesIO

from PIL import Image

max_logo_bytes = 2 * 1024 * 1000


def transform_image(decoded_bytes):
    width, height = 480, 348
    image_pil = Image.open(BytesIO(decoded_bytes))
    ratio_w = width / image_pil.width
    ratio_h = height / image_pil.height
    if ratio_w < ratio_h:
        # It must be fixed by width
        resize_width = width
        resize_height = round(ratio_w * image_pil.height)
    else:
        # Fixed by height
        resize_width = round(ratio_h * image_pil.width)
        resize_height = height
    image_resize = image_pil.resize((resize_width, resize_height), Image.LANCZOS)
    background = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    offset = (round((width - resize_width) / 2), round((height - resize_height) / 2))
    background.paste(image_resize, offset)
    buffer = BytesIO()
    background.convert('RGB').save(buffer, "PNG")
    return base64.encodebytes(buffer.getvalue()).decode("utf-8")
