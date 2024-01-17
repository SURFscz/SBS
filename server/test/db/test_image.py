import base64
import os
import urllib.request
from io import BytesIO
from unittest import TestCase

from PIL import UnidentifiedImageError, Image

from server.db.image import transform_image


class TestImage(TestCase):

    def test_transform_image(self):
        self.do_assert_transform("vertical.png")
        self.do_assert_transform("horizontal.png")

    def test_transform_image_from_url(self):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/../images/eduid.png"
        res = urllib.request.urlopen(f"file://{file}")
        image_pil = Image.open(BytesIO(base64.b64decode(transform_image(res.read()).encode())))
        self.assertEqual(480, image_pil.width)
        self.assertEqual(348, image_pil.height)

    def do_assert_transform(self, image):
        file = f"{os.path.dirname(os.path.realpath(__file__))}/../images/{image}"
        with open(file, "rb") as f:
            decoded_bytes = f.read()
            base64_encoded_string = transform_image(decoded_bytes)
            decoded_bytes = base64.b64decode(base64_encoded_string.encode())
            image_pil = Image.open(BytesIO(decoded_bytes))
            self.assertEqual(480, image_pil.width)
            self.assertEqual(348, image_pil.height)

    def test_invalid_images(self):
        def assert_invalid_image():
            transform_image("test".encode())

        self.assertRaises(UnidentifiedImageError, assert_invalid_image)
