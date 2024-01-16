import datetime
import logging
import time

from flask import jsonify

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED, STATUS_ACTIVE
from server.db.domain import CollaborationMembership
from server.mail import mail_membership_expires_notification
from server.tools import dt_now

membership_expiration_lock_name = "membership_expiration_lock_name"


def _result_container():
    return {"memberships_warned": {},
            "memberships_expired": {},
            "memberships_deleted": {}}


def _do_expire_memberships(app):
    with app.app_context():
        cfq = app.app_config.membership_expiration

        now = dt_now()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running expire_memberships job")

        notification_start_date = now + datetime.timedelta(days=cfq.expired_warning_mail_days_threshold - 1)
        notification_end_date = now + datetime.timedelta(days=cfq.expired_warning_mail_days_threshold)
        memberships_warned = CollaborationMembership.query \
            .filter(CollaborationMembership.status == STATUS_ACTIVE) \
            .filter(CollaborationMembership.expiry_date > notification_start_date) \
            .filter(CollaborationMembership.expiry_date < notification_end_date).all()  # noqa: E712

        for membership in memberships_warned:
            mail_membership_expires_notification(membership, True)

        deletion_date = now - datetime.timedelta(days=cfq.expired_memberships_days_threshold - 1)
        memberships_deleted = CollaborationMembership.query \
            .filter(CollaborationMembership.status == STATUS_EXPIRED) \
            .filter(CollaborationMembership.expiry_date < deletion_date).all()  # noqa: E712
        for membership in memberships_deleted:
            # ensure we have the user and collaboration in the json
            membership.user.name
            membership.collaboration.name
            db.session.delete(membership)
        memberships_deleted_json = jsonify(memberships_deleted).json

        memberships_expired = CollaborationMembership.query \
            .filter(CollaborationMembership.status == STATUS_ACTIVE) \
            .filter(CollaborationMembership.expiry_date < now).all()  # noqa: E712
        for membership in memberships_expired:
            mail_membership_expires_notification(membership, False)
            membership.status = STATUS_EXPIRED
            db.session.merge(membership)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running expire_memberships job in {end - start} ms")

        return {"memberships_warned": jsonify(memberships_warned).json,
                "memberships_expired": jsonify(memberships_expired).json,
                "memberships_deleted": memberships_deleted_json}


def expire_memberships(app):
    return obtain_lock(app, membership_expiration_lock_name, _do_expire_memberships, _result_container)
