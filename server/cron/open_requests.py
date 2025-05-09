import logging
import time

from server.cron.shared import obtain_lock
from server.db.defaults import STATUS_OPEN
from server.db.domain import CollaborationRequest, User, \
    JoinRequest, ServiceConnectionRequest, ServiceRequest
from server.mail import mail_open_requests

open_requests_lock_name = "open_requests_lock_name"


def _result_container():
    return {
        "collaboration_requests": [],
        "join_requests": [],
        "service_connection_requests": [],
        "service_requests": []
    }


def _units_of_collaboration_request(collaboration_request: CollaborationRequest):
    if collaboration_request.units:
        return ", ".join([u.name for u in collaboration_request.units])
    return "-"


def _recipients_to_json(recipients: dict):
    recipients_json = {}

    def open_request_summary(collection_name, requests):
        if collection_name == "collaboration_requests":
            return [{"name": cr.name, "requester": cr.requester.email, "units": _units_of_collaboration_request(cr)} for
                    cr in requests]
        if collection_name == "join_requests":
            return [{"name": jr.collaboration.name, "requester": jr.user.email} for jr in requests]
        if collection_name == "service_connection_requests":
            return [
                {"service": scr.service.name, "organisation": scr.collaboration.name, "requester": scr.requester.email}
                for scr in requests]
        if collection_name == "service_requests":
            return [{"name": sr.name, "requester": sr.requester.email} for sr in requests]

    for key, val in recipients.items():
        recipients_json[key] = {k: open_request_summary(k, v) for k, v in val.items()}
    return recipients_json


def _add_open_request_to_recipient(user: User, recipients: dict, collection_name, open_request):
    recipient = recipients.get(user.email)
    if not recipient:
        recipient = _result_container()
        recipients[user.email] = recipient
    recipient[collection_name].append(open_request)


def _do_open_requests(app):
    with app.app_context():
        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running open_requests job")

        # We track per recipient all open requests collections, see _result_container
        recipients = {}

        collaboration_requests = CollaborationRequest.query \
            .filter(CollaborationRequest.status == STATUS_OPEN) \
            .all()
        for cr in collaboration_requests:
            org_admins = [member for member in cr.organisation.organisation_memberships if member.role == "admin"]
            for org_admin in org_admins:
                logger.info(f"Sending mail about open CO request {cr.name} for Org {cr.organisation.short_name} "
                            f"to {org_admin.user.email}")
                _add_open_request_to_recipient(org_admin.user, recipients, "collaboration_requests", cr)

        join_requests = JoinRequest.query \
            .filter(JoinRequest.status == STATUS_OPEN) \
            .all()
        for jr in join_requests:
            co_admins = [member for member in jr.collaboration.collaboration_memberships if member.role == "admin"]
            for co_admin in co_admins:
                logger.info(
                    f"Sending mail about open join request {jr.user.email} for CO {jr.collaboration.global_urn} "
                    f"to {co_admin.user.email}")
                _add_open_request_to_recipient(co_admin.user, recipients, "join_requests", jr)

        service_connection_requests = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.status == STATUS_OPEN) \
            .filter(ServiceConnectionRequest.pending_organisation_approval == False) \
            .all()  # noqa: E712
        for scr in service_connection_requests:
            service_admins = [member for member in scr.service.service_memberships if member.role == "admin"]
            for sa in service_admins:
                logger.info(
                    f"Sending mail about open service connection request for service {scr.service.abbreviation} "
                    f"and CO {scr.collaboration.global_urn} for Service approval to {sa.user.email}")
                _add_open_request_to_recipient(sa.user, recipients, "service_connection_requests", scr)

        service_connection_requests = ServiceConnectionRequest.query \
            .filter(ServiceConnectionRequest.status == STATUS_OPEN) \
            .filter(ServiceConnectionRequest.pending_organisation_approval == True) \
            .all()  # noqa: E712
        for scr in service_connection_requests:
            org_admins = [m for m in scr.collaboration.organisation.organisation_memberships if m.role == "admin"]
            for admin in org_admins:
                logger.info(
                    f"Sending mail about open service connection request for service {scr.service.abbreviation} "
                    f"and CO {scr.collaboration.global_urn} for Org approval to {admin.user.email}")
                _add_open_request_to_recipient(admin.user, recipients, "service_connection_requests", scr)

        config = app.app_config
        admin_users = [u.uid for u in config.admin_users]
        platform_admins = User.query.filter(User.uid.in_(admin_users)).all()
        service_requests = ServiceRequest.query \
            .filter(ServiceRequest.status == STATUS_OPEN) \
            .all()
        for sr in service_requests:
            for platform_admin in platform_admins:
                logger.info(f"Sending mail about open service request for service {sr.name} "
                            f"to platform admin {platform_admin.email}")
                _add_open_request_to_recipient(platform_admin, recipients, "service_requests", sr)

        for recipient, context in recipients.items():
            mail_open_requests(recipient, context)

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running open_requests job in {end - start} ms")

        return _recipients_to_json(recipients)


def open_requests(app):
    return obtain_lock(app, open_requests_lock_name, _do_open_requests, _result_container)
