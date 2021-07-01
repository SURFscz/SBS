# -*- coding: future_fstrings -*-
import datetime
import logging
import time

from flask import jsonify

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED, STATUS_ACTIVE
from server.db.domain import Collaboration
from server.mail import mail_collaboration_expires_notification

collaboration_inactivity_suspension_lock_name = "collaboration_inactivity_suspension_lock_name"


def _result_container():
    return {"collaborations_warned": {},
            "collaborations_suspended": {},
            "collaborations_deleted": {}}


def _do_suspend_collaboration(app):
    with app.app_context():
        cfq = app.app_config.collaboration_suspension

        now = datetime.datetime.utcnow()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running collaboration_suspension job")

        notification_start_date = now + datetime.timedelta(days=cfq.inactivity_warning_mail_days_threshold - 1)
        notification_end_date = now + datetime.timedelta(days=cfq.inactivity_warning_mail_days_threshold)
        collaborations_warned = Collaboration.query \
            .filter(Collaboration.last_activity_date > notification_start_date) \
            .filter(Collaboration.last_activity_date < notification_end_date).all()  # noqa: E712

        for coll in collaborations_warned:
            mail_collaboration_expires_notification(coll, True)
        # TODO finsh
        collaborations_expired = Collaboration.query \
            .filter(Collaboration.status == STATUS_ACTIVE) \
            .filter(Collaboration.expiry_date < now).all()  # noqa: E712
        for coll in collaborations_expired:
            mail_collaboration_expires_notification(coll, False)
            coll.status = STATUS_EXPIRED
            db.session.merge(coll)
        if collaborations_expired:
            db.session.commit()

        deletion_date = now - datetime.timedelta(days=cfq.expired_collaborations_days_threshold - 1)
        collaborations_deleted = Collaboration.query \
            .filter(Collaboration.status == STATUS_EXPIRED) \
            .filter(Collaboration.expiry_date < deletion_date).all()  # noqa: E712
        for coll in collaborations_deleted:
            db.session.delete(coll)
        if collaborations_deleted:
            db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running expire_collaboration job in {end - start} ms")

        return {"collaborations_warned": jsonify(collaborations_warned).json,
                "collaborations_expired": jsonify(collaborations_expired).json,
                "collaborations_deleted": jsonify(collaborations_deleted).json}


def suspend_collaboration(app):
    return obtain_lock(app, collaboration_inactivity_suspension_lock_name, _do_suspend_collaboration, _result_container)
