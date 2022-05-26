# -*- coding: future_fstrings -*-
import datetime

from flask import Blueprint, request as current_request, current_app

from server.api.base import json_endpoint
from server.auth.security import secure_hash
from server.auth.tokens import validate_service_token
from server.auth.user_claims import user_memberships
from server.db.db import db
from server.db.domain import UserToken

token_api = Blueprint("token_api", __name__, url_prefix="/api/tokens")


@token_api.route("/introspect", methods=["POST"], strict_slashes=False)
@json_endpoint
def introspect():
    service = validate_service_token("token_enabled")
    token = current_request.form.get("token")
    hashed_token = secure_hash(token)
    user_token = UserToken.query.filter(UserToken.hashed_token == hashed_token).first()
    if not user_token or user_token.service_id != service.id:
        return {"status": "token-unknown", "active": False}, 200

    current_time = datetime.datetime.utcnow()
    expiry_date = current_time - datetime.timedelta(days=service.token_validity_days)
    if user_token.created_at < expiry_date:
        return {"status": "token-expired", "active": False}, 200

    user = user_token.user
    if user.suspended:
        return {"status": "user-suspended", "active": False}, 200

    connected_collaborations = []
    memberships = []
    for cm in user.collaboration_memberships:
        connected = list(filter(lambda s: s.id == service.id, cm.collaboration.services))
        if connected or list(filter(lambda s: s.id == service.id, cm.collaboration.organisation.services)):
            connected_collaborations.append(cm.collaboration)
            memberships.append(cm)

    if not connected_collaborations or all(m.is_expired() for m in memberships):
        return {"status": "token-not-connected", "active": False}, 200

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
    return result, 200
