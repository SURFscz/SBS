# -*- coding: future_fstrings -*-
import datetime
import logging
import time

from server.db.domain import CollaborationRequest, JoinRequest
from server.mail import mail_outstanding_requests


def outstanding_requests(app):
    with app.app_context():
        cfq = app.app_config.platform_admin_notifications

        current_time = datetime.datetime.utcnow()
        retention_date = current_time - datetime.timedelta(days=cfq.outstanding_join_request_days_threshold)

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running outstanding_request job")

        collaboration_requests = CollaborationRequest.query \
            .filter(CollaborationRequest.created_at < retention_date) \
            .filter(CollaborationRequest.status == "open")\
            .all()
        collaboration_join_requests = JoinRequest.query\
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
