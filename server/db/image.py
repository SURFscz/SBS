import base64
import io
import xml.etree.ElementTree as ET
from io import BytesIO

import puremagic
from PIL import Image
from PIL import UnidentifiedImageError

# Allowed image MIME types
ALLOWED_MIME_TYPES = {"jpeg", "png", "gif", "bmp", "webp", "svg+xml", "svg", "jfif"}

# SVG security checks
SVG_FORBIDDEN_TAGS = {"script", "iframe", "object", "embed", "javascript"}


def validate_base64_image(base64_str):
    try:
        image_data = base64.b64decode(base64_str)
        extension = puremagic.from_string(image_data)[1:]

        if extension not in ALLOWED_MIME_TYPES:
            return False, f"Unsupported image format: {extension}"

        if extension == "svg+xml" or extension == "svg":
            return validate_svg(image_data)

        # Validate raster image using PIL
        return validate_raster_image(image_data)

    except puremagic.main.PureError as e:
        return False, f"Invalid image format: {str(e)}"

    except (base64.binascii.Error, ValueError) as e:
        return False, f"Base64 decoding error: {str(e)}"


def validate_raster_image(image_data):
    try:
        image = Image.open(io.BytesIO(image_data))
        image.verify()  # Check for corruption
        return True, "Valid raster image"
    except (UnidentifiedImageError, IOError) as e:
        return False, f"Corrupt or unsupported image: {str(e)}"


def validate_svg(image_data):
    try:
        svg_content = image_data.decode("utf-8").lower()
        for tag in SVG_FORBIDDEN_TAGS:
            if f"<{tag}" in svg_content:
                return False, f"SVG contains forbidden tag: <{tag}>"

        ET.ElementTree(ET.fromstring(svg_content))
        return True, "Valid SVG image"
    except ET.ParseError as e:
        return False, f"Invalid SVG format: {str(e)}"


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
