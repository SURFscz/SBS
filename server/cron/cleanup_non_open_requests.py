import datetime
import logging
import time

from flask import jsonify
from sqlalchemy.orm import selectinload

from server.cron.shared import obtain_lock
from server.db.domain import CollaborationRequest, JoinRequest
from server.db.models import delete
from server.tools import dt_now

cleanup_non_open_requests_lock_name = "cleanup_non_open_requests_lock_name"


def _result_container():
    return {"collaboration_requests": [],
            "collaboration_join_requests": []}


def _do_cleanup_non_open_requests(app):
    with app.app_context():
        cfq = app.app_config.user_requests_retention

        current_time = dt_now()
        retention_date = current_time - datetime.timedelta(days=cfq.outstanding_join_request_days_threshold)

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running cleanup_non_open_requests job")

        collaboration_requests = CollaborationRequest.query \
            .options(selectinload(CollaborationRequest.organisation)) \
            .filter(CollaborationRequest.created_at < retention_date) \
            .filter(CollaborationRequest.status != "open") \
            .all()
        collaboration_join_requests = JoinRequest.query \
            .options(selectinload(JoinRequest.collaboration)) \
            .filter(JoinRequest.created_at < retention_date) \
            .filter(JoinRequest.status != "open") \
            .all()

        collaboration_requests_json = []
        for cr in collaboration_requests:
            logger.info(f"Deleting CollaborationRequest {cr.name} made by {cr.requester.name} "
                        f"in organisation {cr.organisation.name} with status {cr.status}")
            collaboration_requests_json.append(jsonify(cr).json)
            delete(CollaborationRequest, cr.id)

        collaboration_join_requests_json = []
        for cjr in collaboration_join_requests:
            logger.info(f"Deleting JoinRequest made by {cjr.user.name} "
                        f"for {cjr.collaboration.name} with status {cjr.status}")
            collaboration_join_requests_json.append(jsonify(cjr).json)
            delete(JoinRequest, cjr.id)

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running cleanup_non_open_requests job in {end - start} ms")

        return {"collaboration_requests": collaboration_requests_json,
                "collaboration_join_requests": collaboration_join_requests_json}


def cleanup_non_open_requests(app):
    return obtain_lock(app, cleanup_non_open_requests_lock_name, _do_cleanup_non_open_requests, _result_container)
