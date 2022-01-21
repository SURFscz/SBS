# -*- coding: future_fstrings -*-
import base64
import io

from flask import Blueprint, send_file
from werkzeug.exceptions import BadRequest

from server.db.domain import Service, CollaborationRequest, Organisation, Collaboration
from server.db.logo_mixin import logo_from_cache

image_api = Blueprint("image_api", __name__, url_prefix="/api/images")

login_mixins_classes = [Collaboration.__tablename__, CollaborationRequest.__tablename__, Organisation.__tablename__,
                        Service.__tablename__]


@image_api.route("/<object_type>/<sid>", strict_slashes=False)
def get_logo(object_type, sid):
    if object_type not in login_mixins_classes:
        raise BadRequest(f"Not allowed object type {object_type}")
    logo = logo_from_cache(object_type, sid)
    decoded_logo = base64.decodebytes(logo)
    res = send_file(io.BytesIO(decoded_logo), mimetype='image/jpeg')
    res.headers.add('Access-Control-Allow-Origin', '*')
    res.cache_control.clear()
    res.cache_control.max_age = 1209600
    return res
