import datetime
import logging
import time

from flask import jsonify

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED, STATUS_ACTIVE
from server.db.domain import Collaboration
from server.mail import mail_collaboration_expires_notification
from server.tools import dt_now

collaboration_expiration_lock_name = "collaboration_expiration_lock_name"


def _result_container():
    return {"collaborations_warned": {},
            "collaborations_expired": {},
            "collaborations_deleted": {}}


def _do_expire_collaboration(app):
    with app.app_context():
        cfq = app.app_config.collaboration_expiration

        now = dt_now()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running expire_collaboration job")

        notification_start_date = now + datetime.timedelta(days=cfq.expired_warning_mail_days_threshold - 1)
        notification_end_date = now + datetime.timedelta(days=cfq.expired_warning_mail_days_threshold)
        collaborations_warned = Collaboration.query \
            .filter(Collaboration.status == STATUS_ACTIVE) \
            .filter(Collaboration.expiry_date > notification_start_date) \
            .filter(Collaboration.expiry_date < notification_end_date).all()  # noqa: E712

        for coll in collaborations_warned:
            logger.info(f"Send expiration warning for CO {coll.global_urn} ({coll.name})")
            mail_collaboration_expires_notification(coll, True)

        deletion_date = now - datetime.timedelta(days=cfq.expired_collaborations_days_threshold - 1)
        collaborations_deleted = Collaboration.query \
            .filter(Collaboration.status == STATUS_EXPIRED) \
            .filter(Collaboration.expiry_date < deletion_date).all()  # noqa: E712
        for coll in collaborations_deleted:
            logger.info(f"Deleting expired CO {coll.global_urn} ({coll.name})")
            db.session.delete(coll)

        collaborations_expired = Collaboration.query \
            .filter(Collaboration.status == STATUS_ACTIVE) \
            .filter(Collaboration.expiry_date < now).all()  # noqa: E712
        for coll in collaborations_expired:
            logger.info(f"Send expiration notification for CO {coll.global_urn} ({coll.name})")
            mail_collaboration_expires_notification(coll, False)
            coll.status = STATUS_EXPIRED
            db.session.merge(coll)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running expire_collaboration job in {end - start} ms")

        return {"collaborations_warned": jsonify(collaborations_warned).json,
                "collaborations_expired": jsonify(collaborations_expired).json,
                "collaborations_deleted": jsonify(collaborations_deleted).json}


def expire_collaborations(app):
    return obtain_lock(app, collaboration_expiration_lock_name, _do_expire_collaboration, _result_container)
