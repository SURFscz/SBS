# -*- coding: future_fstrings -*-
from flask import Blueprint, current_app, jsonify

from server.api.base import json_endpoint
from server.auth.security import current_user_id
from server.db.domain import Aup
from server.db.models import save
from server.tools import read_file

aup_api = Blueprint("aup_api", __name__, url_prefix="/api/aup")


@aup_api.route("/", methods=["GET"], strict_slashes=False)
@json_endpoint
def links():
    return {
               "url_aup_en": current_app.app_config.aup.url_aup_en,
               "url_aup_nl": current_app.app_config.aup.url_aup_nl
           }, 200


@aup_api.route("/agree", methods=["POST"], strict_slashes=False)
@json_endpoint
def agreed_aup():
    aup = Aup(au_version=current_app.app_config.aup.pdf, user_id=current_user_id())
    aup_json = jsonify(aup).json
    return save(Aup, custom_json=aup_json, allow_child_cascades=False)
