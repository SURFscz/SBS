import os
import uuid
import base64
from flask import Blueprint, current_app
from flask import request as current_request, session
from werkzeug.exceptions import Forbidden
from signxml import XMLSigner, XMLVerifier
import xml.etree.ElementTree as ET
from lxml import etree
from server.api.base import json_endpoint, query_param
from server.auth.secrets import generate_token
from server.auth.security import is_admin_user, CSRF_TOKEN, confirm_allow_impersonation, confirm_write_access
from server.auth.surf_conext import surf_public_signing_certificate
from server.auth.user_claims import add_user_claims
from server.db.db import db
from server.db.domain import User
from server.tools import read_file

mock_user_api = Blueprint("mock_user_api", __name__, url_prefix="/api/mock")


@mock_user_api.route("/", methods=["PUT"], strict_slashes=False)
@json_endpoint
def login_user():
    if not os.environ.get("ALLOW_MOCK_USER_API", None):
        raise Forbidden()
    if session.get("eb_interrupt_flow", False):
        return None, 201
    data = current_request.get_json()
    sub = data["sub"]  # oidc sub maps to sbs uid - see user_claims
    user = User.query.filter(User.uid == sub).first() or User(created_by="system", updated_by="system",
                                                              external_id=str(uuid.uuid4()))
    user.successful_login()
    add_user_claims(data, sub, user)

    db.session.merge(user)

    res = {"admin": is_admin_user(user), "guest": False}
    session_data = {
        "id": user.id,
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "user_accepted_aup": user.has_agreed_with_aup(),
        "second_factor_confirmed": data.get("second_factor_confirmed", True),
        "rate_limited": user.rate_limited
    }
    session["user"] = {**session_data, **res}
    if CSRF_TOKEN not in session:
        session[CSRF_TOKEN] = generate_token()
    return None, 201


@mock_user_api.route("/interrupt_data", methods=["GET"], strict_slashes=False)
@json_endpoint
def eb_interrupt_data():
    if not os.environ.get("ALLOW_MOCK_USER_API", None):
        raise Forbidden()
    confirm_write_access()

    user_uid = query_param("user_uid")
    data_to_sign = f"<User user_id='{user_uid}'/>"
    cert = surf_public_signing_certificate(current_app)
    private_key = read_file("test/data/privkey.pem")
    root = etree.fromstring(data_to_sign)
    signed_root = XMLSigner().sign(root, key=private_key, cert=cert)
    signed_root_str = etree.tostring(signed_root)
    b64encoded_signed_root = base64.b64encode(signed_root_str)
    data = {"signed_user": b64encoded_signed_root.decode(),
            "continue_url": "https://eb.com"}
    # in this flow, we don't want to create a mock-user
    session["eb_interrupt_flow"] = True
    return data, 200


@mock_user_api.route("stop_interrupt_flow", methods=["DLETE"], strict_slashes=False)
@json_endpoint
def eb_stop_interrupt_flow():
    if not os.environ.get("ALLOW_MOCK_USER_API", None):
        raise Forbidden()
    confirm_write_access()
    session["eb_interrupt_flow"] = None
    return {}, 200
