import datetime
import logging
import time

from flask import jsonify

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, STATUS_SUSPENDED
from server.db.domain import Collaboration
from server.mail import mail_collaboration_suspension_notification
from server.tools import dt_now

collaboration_inactivity_suspension_lock_name = "collaboration_inactivity_suspension_lock_name"


def _result_container():
    return {"collaborations_warned": {},
            "collaborations_suspended": {},
            "collaborations_deleted": {}}


def _do_suspend_collaboration(app):
    with app.app_context():
        cfq = app.app_config.collaboration_suspension

        now = dt_now()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running collaboration_suspension job")

        threshold_for_warning = cfq.collaboration_inactivity_days_threshold - cfq.inactivity_warning_mail_days_threshold
        notification_start_date = now - datetime.timedelta(days=threshold_for_warning)
        notification_end_date = now - datetime.timedelta(days=threshold_for_warning - 1)
        # Collaborations with an expiry_date are excluded as they are dealt with in collaboration_expiration.py
        collaborations_warned = Collaboration.query \
            .filter(Collaboration.expiry_date.is_(None)) \
            .filter(Collaboration.last_activity_date > notification_start_date) \
            .filter(Collaboration.last_activity_date < notification_end_date).all()  # noqa: E712

        for coll in collaborations_warned:
            logger.info(f"Sending suspension warning for CO {coll.global_urn} ({coll.name})")
            mail_collaboration_suspension_notification(coll, True)

        threshold_for_deletion = cfq.collaboration_inactivity_days_threshold + cfq.collaboration_deletion_days_threshold
        deletion_date = now - datetime.timedelta(days=threshold_for_deletion)
        collaborations_deleted = Collaboration.query \
            .filter(Collaboration.expiry_date.is_(None)) \
            .filter(Collaboration.status == STATUS_SUSPENDED) \
            .filter(Collaboration.last_activity_date < deletion_date).all()  # noqa: E712
        for coll in collaborations_deleted:
            logger.info(f"Deleting suspensed CO {coll.global_urn} ({coll.name})")
            db.session.delete(coll)

        suspension_end_date = now - datetime.timedelta(days=cfq.collaboration_inactivity_days_threshold - 1)
        collaborations_suspended = Collaboration.query \
            .filter(Collaboration.expiry_date.is_(None)) \
            .filter(Collaboration.status == STATUS_ACTIVE) \
            .filter(Collaboration.last_activity_date < suspension_end_date).all()  # noqa: E712
        for coll in collaborations_suspended:
            logger.info(f"Sending suspension notification for CO {coll.global_urn} ({coll.name})")
            mail_collaboration_suspension_notification(coll, False)
            coll.status = STATUS_SUSPENDED
            # Need to mark this field dirty otherwise the DB default kicks in
            coll.last_activity_date = coll.last_activity_date + datetime.timedelta(seconds=5)
            db.session.merge(coll)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running collaboration_suspension job in {end - start} ms")

        return {"collaborations_warned": jsonify(collaborations_warned).json,
                "collaborations_suspended": jsonify(collaborations_suspended).json,
                "collaborations_deleted": jsonify(collaborations_deleted).json}


def suspend_collaborations(app):
    return obtain_lock(app, collaboration_inactivity_suspension_lock_name, _do_suspend_collaboration, _result_container)
