import datetime

from flask import Blueprint, request as current_request, current_app

from server.api.base import json_endpoint
from server.auth.secrets import secure_hash
from server.auth.tokens import validate_service_token
from server.auth.user_claims import user_memberships, collaboration_memberships_for_service
from server.db.db import db
from server.db.defaults import USER_TOKEN_INTROSPECT, SERVICE_TOKEN_INTROSPECTION
from server.db.activity import update_last_activity_date
from server.db.domain import UserToken
from server.db.models import log_user_login

token_api = Blueprint("token_api", __name__, url_prefix="/api/tokens")


@token_api.route("/introspect", methods=["POST"], strict_slashes=False)
@json_endpoint
def introspect():
    service = validate_service_token("token_enabled", SERVICE_TOKEN_INTROSPECTION)
    token = current_request.form.get("token")
    hashed_token = secure_hash(token)
    user_token = UserToken.query.filter(UserToken.hashed_token == hashed_token).first()
    res = {"active": True}
    if not user_token or user_token.service_id != service.id:
        res = {"status": "token-unknown", "active": False}

    current_time = datetime.datetime.utcnow()
    expiry_date = current_time - datetime.timedelta(days=service.token_validity_days)
    if res["active"] and user_token.created_at < expiry_date:
        res = {"status": "token-expired", "active": False}

    user = user_token.user if user_token else None
    if res["active"] and user.suspended:
        res = {"status": "user-suspended", "active": False}

    memberships = collaboration_memberships_for_service(user, service)
    connected_collaborations = [cm.collaboration for cm in memberships]

    if res["active"] and (not connected_collaborations or all(m.is_expired() for m in memberships)):
        res = {"status": "token-not-connected", "active": False}

    if not res["active"]:
        log_user_login(USER_TOKEN_INTROSPECT, False, user, user.uid if user else None, service, service.entity_id,
                       status=res["status"])
        return res, 200

    for collaboration in connected_collaborations:
        update_last_activity_date(collaboration.id)

    user_token.last_used_date = current_time
    db.session.merge(user_token)

    epoch = int(current_time.timestamp())
    entitlements = user_memberships(user, connected_collaborations)
    result = {
        "active": True,
        "status": "token-valid",
        "client_id": service.entity_id,
        "sub": user.uid,
        "username": user.username,
        "iat": epoch,
        "exp": epoch + 5 * 60,
        "aud": service.entity_id,
        "iss": current_app.app_config.base_url,
        "user": {
            "name": user.name,
            "given_name": user.given_name,
            "familiy_name": user.family_name,
            "email": user.email,
            "sub": user.uid,
            "voperson_external_id": user.eduperson_principal_name,
            "voperson_external_affiliation": user.scoped_affiliation,
            "uid": user.uid,
            "username": user.username,
            "eduperson_entitlement": list(entitlements)
        }
    }
    log_user_login(USER_TOKEN_INTROSPECT, True, user, user.uid, service, service.entity_id, status="token-valid")
    return result, 200
