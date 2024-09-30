import os

from flask import request as current_request, redirect, session, current_app
from onelogin.saml2.auth import OneLogin_Saml2_Auth

AUTHN_REQUEST_ID = "AuthNRequestID"
USER_UID = "UserUID"


def saml_auth():
    saml_dir = current_app.app_config.ssid_config_folder
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", saml_dir)
    req = {
        "https": "on" if current_request.scheme == "https" else "off",
        "http_host": current_request.host,
        "script_name": current_request.path,
        "get_data": current_request.args.copy(),
        "post_data": current_request.form.copy()
    }
    auth = OneLogin_Saml2_Auth(req, custom_base_path=path)
    return auth


