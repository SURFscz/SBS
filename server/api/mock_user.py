# -*- coding: future_fstrings -*-
import datetime
import itertools
import json
import random
import re
import string
import subprocess
import tempfile
import unicodedata
import urllib.parse
import uuid

import requests
from flask import Blueprint, current_app, redirect
from flask import request as current_request, session, jsonify
from sqlalchemy import text, or_, bindparam, String
from sqlalchemy.orm import contains_eager
from werkzeug.exceptions import Forbidden

from server.api.base import json_endpoint, query_param, ctx_logger
from server.api.base import replace_full_text_search_boolean_mode_chars
from server.auth.security import confirm_allow_impersonation, is_admin_user, current_user_id, confirm_read_access, \
    confirm_collaboration_admin, confirm_organisation_admin
from server.auth.user_claims import add_user_claims
from server.cron.schedule import create_suspend_notification
from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import User, OrganisationMembership, CollaborationMembership
from server.db.models import update

mock_user_api = Blueprint("mock_user_api", __name__, url_prefix="/api/mock")


@mock_user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def update_user():
     current_request.get_json()

    res = {"admin": is_admin_user(user), "guest": False, "confirmed_admin": user.confirmed_super_user}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email
    }
    session["user"] = {**session_data, **res}

    headers = current_request.headers
    user_id = ["id"]

    impersonate_id = headers.get("X-IMPERSONATE-ID", default=None, type=int)
    if impersonate_id:
        confirm_allow_impersonation()
    else:
        if user_id != current_user_id():
            raise Forbidden()

    user = User.query.get(user_id)
    custom_json = jsonify(user).json
    user_json = current_request.get_json()
    for attr in ["ssh_key", "ubi_key", "tiqr_key", "totp_key"]:
        custom_json[attr] = user_json.get(attr)

    if "ssh_key" in user_json:
        if "convertSSHKey" in user_json and user_json["convertSSHKey"]:
            ssh_key = user_json["ssh_key"]
            if ssh_key and ssh_key.startswith("---- BEGIN SSH2 PUBLIC KEY ----"):
                with tempfile.NamedTemporaryFile() as f:
                    f.write(ssh_key.encode())
                    f.flush()
                    res = subprocess.run(["ssh-keygen", "-i", "-f", f.name], stdout=subprocess.PIPE)
                    if res.returncode == 0:
                        custom_json["ssh_key"] = res.stdout.decode()

    return update(User, custom_json=custom_json, allow_child_cascades=False)

