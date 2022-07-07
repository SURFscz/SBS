# -*- coding: future_fstrings -*-
import datetime
import logging
import time

from flask import jsonify

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import CollaborationMembership, User, OrganisationMembership, ServiceMembership, \
    CollaborationRequest, JoinRequest
from server.mail import mail_membership_orphan_user_deleted

orphan_users_lock_name = "orphan_users_lock_name"


def _result_container():
    return {"orphan_users": []}


def _do_orphan_users(app):
    with app.app_context():
        cfq = app.app_config.orphan_users

        now = datetime.datetime.utcnow()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running orphan_users job")

        delete_date_threshold = now - datetime.timedelta(days=cfq.delete_days_threshold)

        organisation_membership_subquery = ~OrganisationMembership.query\
            .filter(OrganisationMembership.user_id == User.id)\
            .exists()
        collaboration_membership_subquery = ~CollaborationMembership.query\
            .filter(CollaborationMembership.user_id == User.id)\
            .exists()
        service_membership_subquery = ~ServiceMembership.query\
            .filter(ServiceMembership.user_id == User.id)\
            .exists()
        collaboration_request_subquery = ~CollaborationRequest.query\
            .filter(CollaborationRequest.requester_id == User.id)\
            .exists()
        join_request_subquery = ~JoinRequest.query\
            .filter(JoinRequest.user_id == User.id)\
            .exists()
        users = User.query \
            .filter(organisation_membership_subquery) \
            .filter(collaboration_membership_subquery) \
            .filter(service_membership_subquery) \
            .filter(collaboration_request_subquery) \
            .filter(join_request_subquery) \
            .filter(User.created_at < delete_date_threshold)\
            .all()

        for user in users:
            mail_membership_orphan_user_deleted(user)
            db.session.delete(user)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running orphan_users job in {end - start} ms")

        return {"orphan_users": jsonify([user.email for user in users]).json}


def delete_orphan_users(app):
    return obtain_lock(app, orphan_users_lock_name, _do_orphan_users, _result_container)
