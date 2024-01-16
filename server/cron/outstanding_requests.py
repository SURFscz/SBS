import datetime
import logging
import time

from flask import jsonify
from sqlalchemy.orm import contains_eager

from server.cron.shared import obtain_lock
from server.db.domain import CollaborationRequest, JoinRequest
from server.mail import mail_outstanding_requests
from server.tools import dt_now

outstanding_requests_lock_name = "outstanding_requests_lock_name"


def _result_container():
    return {"collaboration_requests": [],
            "collaboration_join_requests": []}


def _do_outstanding_requests(app):
    with app.app_context():
        cfq = app.app_config.platform_admin_notifications

        current_time = dt_now()
        retention_date = current_time - datetime.timedelta(days=cfq.outstanding_join_request_days_threshold)

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running outstanding_request job")

        collaboration_requests = CollaborationRequest.query \
            .join(CollaborationRequest.organisation) \
            .options(contains_eager(CollaborationRequest.organisation)) \
            .filter(CollaborationRequest.created_at < retention_date) \
            .filter(CollaborationRequest.status == "open") \
            .all()
        collaboration_join_requests = JoinRequest.query \
            .join(JoinRequest.collaboration) \
            .options(contains_eager(JoinRequest.collaboration)) \
            .filter(JoinRequest.created_at < retention_date) \
            .filter(JoinRequest.status == "open") \
            .all()

        if collaboration_requests or collaboration_join_requests:
            logger.info(f"Sending daily email with outstanding requests"
                        f"(collaboration_requests: {len(collaboration_requests)}, "
                        f"collaboration_join_requests: {len(collaboration_join_requests)})")
            mail_outstanding_requests(collaboration_requests, collaboration_join_requests)

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running outstanding_request job in {end - start} ms")

        collaboration_requests = jsonify(collaboration_requests).json
        collaboration_join_requests = jsonify(collaboration_join_requests).json

        return {"collaboration_requests": collaboration_requests,
                "collaboration_join_requests": collaboration_join_requests}


def outstanding_requests(app):
    return obtain_lock(app, outstanding_requests_lock_name, _do_outstanding_requests, _result_container)
