import base64
import io

from flask import Blueprint, session
from flask import send_file
from werkzeug.exceptions import NotFound

from server.db.logo_mixin import logo_from_cache

image_api = Blueprint("image_api", __name__, url_prefix="/api/images")


@image_api.route("/<object_type>/<sid>", strict_slashes=False)
def get_logo(object_type, sid):
    logo = logo_from_cache(object_type, sid)
    decoded_logo = base64.decodebytes(logo)
    res = send_file(io.BytesIO(decoded_logo), mimetype='image/jpeg')
    res.headers.add('Access-Control-Allow-Origin', '*')
    res.cache_control.clear()
    res.cache_control.max_age = 31536000
    return res
