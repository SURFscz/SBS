# -*- coding: future_fstrings -*-
import uuid

from flask import Blueprint, request as current_request, current_app
from munch import munchify
from sqlalchemy.orm import contains_eager

from server.api.base import json_endpoint
from server.api.collaboration import assign_global_urn_to_organisation
from server.auth.security import current_user_id, confirm_organisation_admin, current_user_name
from server.db.db import User, Organisation, CollaborationRequest, Collaboration, CollaborationMembership, db
from server.db.models import save
from server.mail import mail_collaboration_request, mail_accepted_declined_collaboration_request

collaboration_request_api = Blueprint("collaboration_request_api", __name__, url_prefix="/api/collaboration_requests")


@collaboration_request_api.route("/<collaboration_request_id>", methods=["GET"], strict_slashes=False)
@json_endpoint
def collaboration_request_by_id(collaboration_request_id):
    res = CollaborationRequest.query \
        .join(CollaborationRequest.organisation) \
        .join(CollaborationRequest.requester) \
        .options(contains_eager(CollaborationRequest.organisation)) \
        .options(contains_eager(CollaborationRequest.requester)) \
        .filter(CollaborationRequest.id == collaboration_request_id) \
        .one()
    confirm_organisation_admin(res.organisation_id)
    return res, 200


@collaboration_request_api.route("/", methods=["POST"], strict_slashes=False)
@json_endpoint
def request_collaboration():
    data = current_request.get_json()
    user = User.query.get(current_user_id())
    organisation = Organisation.query.filter(Organisation.schac_home_organisation == user.schac_home_organisation).one()
    data["requester_id"] = user.id
    res = save(CollaborationRequest, custom_json=data)

    context = {"salutation": f"Dear {organisation.name} organisation admin",
               "base_url": current_app.app_config.base_url,
               "collaboration_request": data,
               "user": user}
    recipients = list(map(lambda membership: membership.user.email, organisation.organisation_memberships))
    if recipients:
        mail_collaboration_request(context, munchify(data), recipients)

    return res


@collaboration_request_api.route("/approve/<collaboration_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def approve_request(collaboration_request_id):
    collaboration_request = CollaborationRequest.query.get(collaboration_request_id)
    confirm_organisation_admin(collaboration_request.organisation_id)
    client_data = current_request.get_json()
    attributes = ["name", "short_name", "description", "organisation_id", "accepted_user_policy"]

    # take the data from client_data as it can be different
    data = {"identifier": str(uuid.uuid4())}
    for attr in attributes:
        data[attr] = client_data.get(attr, None)
    assign_global_urn_to_organisation(collaboration_request.organisation, data)

    res = save(Collaboration, custom_json=data)
    collaboration = res[0]

    user = collaboration_request.requester
    admin_collaboration_membership = CollaborationMembership(role="admin", user=user, collaboration=collaboration,
                                                             created_by=user.uid, updated_by=user.uid)
    db.session.merge(admin_collaboration_membership)

    mail_accepted_declined_collaboration_request({"salutation": f"Dear {user.name}",
                                                  "base_url": current_app.app_config.base_url,
                                                  "administrator": current_user_name(),
                                                  "collaboration": collaboration,
                                                  "organisation": collaboration_request.organisation},
                                                 collaboration.name,
                                                 True,
                                                 [user.email])

    db.session.delete(collaboration_request)
    return res


@collaboration_request_api.route("/deny/<collaboration_request_id>", methods=["PUT"], strict_slashes=False)
@json_endpoint
def deny_request(collaboration_request_id):
    collaboration_request = CollaborationRequest.query.get(collaboration_request_id)
    confirm_organisation_admin(collaboration_request.organisation_id)

    user = collaboration_request.requester
    mail_accepted_declined_collaboration_request({"salutation": f"Dear {user.name}",
                                                  "base_url": current_app.app_config.base_url,
                                                  "administrator": current_user_name(),
                                                  "collaboration": {"name": collaboration_request.name},
                                                  "organisation": collaboration_request.organisation},
                                                 collaboration_request.name,
                                                 False,
                                                 [user.email])

    db.session.delete(collaboration_request)
    return None, 201
