import datetime

from flasgger import swag_from
from flask import Blueprint, request as current_request, current_app

from server.api.base import json_endpoint
from server.auth.secrets import secure_hash
from server.auth.service_access import collaboration_memberships_for_service, has_user_access_to_service
from server.auth.tokens import validate_service_token
from server.auth.user_claims import user_memberships
from server.db.activity import update_last_activity_date
from server.db.db import db
from server.db.defaults import USER_TOKEN_INTROSPECT, SERVICE_TOKEN_INTROSPECTION
from server.db.domain import UserToken
from server.db.models import log_user_login
from server.tools import dt_now

token_api = Blueprint("token_api", __name__, url_prefix="/api/tokens")


def failed_login(status, service, user_token):
    user = user_token.user if user_token else None
    user_uid = user.uid if user else None
    log_user_login(USER_TOKEN_INTROSPECT, False, user, user_uid, service, service.entity_id, status)
    return {"status": status, "active": False}, 200


@token_api.route("/introspect", methods=["POST"], strict_slashes=False)
@swag_from("../swagger/public/paths/token_introspect.yml")
@json_endpoint
def introspect():
    service = validate_service_token("token_enabled", SERVICE_TOKEN_INTROSPECTION)
    token = current_request.form.get("token")
    hashed_token = secure_hash(token)
    user_token = UserToken.query.filter(UserToken.hashed_token == hashed_token).first()

    if not user_token or user_token.service_id != service.id:
        return failed_login("token-unknown", service, user_token)

    current_time = dt_now()
    expiry_date = current_time - datetime.timedelta(days=service.token_validity_days)

    if user_token.created_at < expiry_date:
        return failed_login("token-expired", service, user_token)

    # If there is a user_token, then there is a user, cause of DB constraints
    user = user_token.user
    if user.suspended:
        return failed_login("token-suspended", service, user_token)

    if not has_user_access_to_service(service, user):
        return failed_login("token-not-connected", service, user_token)

    memberships = collaboration_memberships_for_service(user_token.user, service)
    connected_collaborations = [cm.collaboration for cm in memberships]

    for collaboration in connected_collaborations:
        update_last_activity_date(collaboration.id)
    current_time = dt_now()
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
