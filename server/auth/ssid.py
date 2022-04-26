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


def redirect_to_surf_secure_id(user):
    auth = saml_auth()
    return_to = auth.get_settings().get_sp_data()['assertionConsumerService']['url']
    name_id = f"urn:collab:person:{user.schac_home_organisation}:{user.home_organisation_uid}"
    # name_id = "urn:collab:person:example.com:oharsta"
    sso_built_url = auth.login(return_to=return_to, name_id_value_req=name_id)
    session[AUTHN_REQUEST_ID] = auth.get_last_request_id()
    session[USER_UID] = user.uid
    return redirect(sso_built_url)
