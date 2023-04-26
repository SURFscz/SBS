import os

from flask import current_app, Blueprint, request as current_request, session
from sqlalchemy import text
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import BadRequest

from server.api.base import json_endpoint
from server.auth.security import confirm_write_access, current_user_id
from server.cron.scim_sweep_services import scim_sweep_services
from server.db.audit_mixin import metadata
from server.db.db import db
from server.db.domain import Service, ServiceMembership, User, Organisation, OrganisationMembership, \
    OrganisationInvitation
from server.mail import mail_feedback
from server.test.seed import seed

system_api = Blueprint("system_api", __name__, url_prefix="/api/system")


def check_seed_allowed(action):
    if not current_app.app_config.feature.seed_allowed:
        raise BadRequest(f"{action} not allowed in this environment")


@system_api.route("/expire_collaborations", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_expire_collaboration():
    confirm_write_access()

    from server.cron.collaboration_expiration import expire_collaborations

    return expire_collaborations(current_app), 201


@system_api.route("/suspend_collaborations", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_suspend_collaborations():
    confirm_write_access()

    from server.cron.collaboration_inactivity_suspension import suspend_collaborations

    return suspend_collaborations(current_app), 201


@system_api.route("/expire_memberships", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_expire_memberships():
    confirm_write_access()

    from server.cron.membership_expiration import expire_memberships

    return expire_memberships(current_app), 201


@system_api.route("/orphan_users", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_orphan_users():
    confirm_write_access()

    from server.cron.orphan_users import delete_orphan_users

    return delete_orphan_users(current_app), 201


@system_api.route("/suspend_users", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_suspend_users():
    confirm_write_access()

    from server.cron.user_suspending import suspend_users

    return suspend_users(current_app), 201


@system_api.route("/outstanding_requests", strict_slashes=False, methods=["GET"])
@json_endpoint
def do_outstanding_requests():
    confirm_write_access()

    from server.cron.outstanding_requests import outstanding_requests

    return outstanding_requests(current_app), 200


@system_api.route("/cleanup_non_open_requests", strict_slashes=False, methods=["PUT"])
@json_endpoint
def do_cleanup_non_open_requests():
    confirm_write_access()

    from server.cron.cleanup_non_open_requests import cleanup_non_open_requests

    return cleanup_non_open_requests(current_app), 201


@system_api.route("/db_stats", strict_slashes=False, methods=["GET"])
@json_endpoint
def do_db_stats():
    confirm_write_access()

    results = []
    tables = list(map(lambda t: str(t.name), metadata.sorted_tables))
    tables.append("audit_logs")
    for table in tables:
        rows = db.session.execute(text(f"SELECT COUNT(*) FROM `{table}`"))
        for row in rows:
            results.append({"name": table, "count": row[0]})

    return sorted(results, key=lambda k: k["count"], reverse=True), 200


@system_api.route("/seed", strict_slashes=False, methods=["GET"])
@json_endpoint
def run_seed():
    confirm_write_access()

    check_seed_allowed("seed")
    try:
        os.environ["SEEDING"] = "1"
        seed(db, current_app.app_config, skip_seed=False, perf_test=False)
        session.clear()
    finally:
        del os.environ["SEEDING"]

    return {}, 201


@system_api.route("/demo_seed", strict_slashes=False, methods=["GET"])
@json_endpoint
def run_demo_seed():
    confirm_write_access()

    check_seed_allowed("demo-seed")
    try:
        os.environ["SEEDING"] = "1"

        from server.test.demo_seed import demo_seed
        demo_seed(db)
        session.clear()
    finally:
        del os.environ["SEEDING"]

    return {}, 201


@system_api.route("/human_testing_seed", strict_slashes=False, methods=["GET"])
@json_endpoint
def run_human_testing_seed():
    confirm_write_access()

    check_seed_allowed("human-testing-seed")

    try:
        os.environ["SEEDING"] = "1"
        from server.test.human_testing_seed import human_testing_seed
        human_testing_seed(db)
        session.clear()
    finally:
        del os.environ["SEEDING"]

    return {}, 201


@system_api.route("/scheduled_jobs", strict_slashes=False, methods=["GET"])
@json_endpoint
def scheduled_jobs():
    confirm_write_access()

    if not hasattr(current_app, "scheduler"):
        return [], 200

    jobs = current_app.scheduler.get_jobs()

    return [{"name": job.name, "next_run_time": job.next_run_time} for job in jobs], 200


@system_api.route("/clean_slate", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def clean_slate():
    confirm_write_access()

    check_seed_allowed("clean_slate")

    seed(db, current_app.app_config, skip_seed=True)

    return {}, 201


@system_api.route("/composition", strict_slashes=False, methods=["GET"])
@json_endpoint
def composition():
    confirm_write_access()

    check_seed_allowed("composition")

    return current_app.app_config, 200


@system_api.route("/clear-audit-logs", strict_slashes=False, methods=["DELETE"])
@json_endpoint
def clear_audit_logs():
    confirm_write_access()

    check_seed_allowed("clear_audit_logs")

    db.session.execute(text("DELETE FROM audit_logs"))
    return {}, 201


@system_api.route("/feedback", strict_slashes=False, methods=["POST"])
@json_endpoint
def feedback():
    cfg = current_app.app_config
    if not cfg.feature.feedback_enabled:
        raise BadRequest("feedback is not enabled")

    data = current_request.get_json()
    message = data["message"]
    mail_conf = cfg.mail
    user = db.session.get(User, current_user_id())
    mail_feedback(mail_conf.environment, message, user, [mail_conf.info_email])
    return {}, 201


@system_api.route("/validations", strict_slashes=False, methods=["GET"])
@json_endpoint
def validations():
    confirm_write_access()

    organizations_subquery = ~OrganisationMembership.query \
        .filter(OrganisationMembership.role == "admin") \
        .filter(OrganisationMembership.organisation_id == Organisation.id) \
        .exists()
    organisations_without_admins = Organisation.query.filter(organizations_subquery).all()

    services_subquery = ~ServiceMembership.query \
        .filter(ServiceMembership.role == "admin") \
        .filter(ServiceMembership.service_id == Service.id) \
        .exists()
    services_without_admins = Service.query.filter(services_subquery).all()

    organisation_invitations = OrganisationInvitation.query \
        .options(joinedload(OrganisationInvitation.organisation)) \
        .options(joinedload(OrganisationInvitation.user)) \
        .all()

    return {
               "organisations": organisations_without_admins,
               "organisation_invitations": organisation_invitations,
               "services": services_without_admins
           }, 200


@system_api.route("/sweep", strict_slashes=False, methods=["GET"])
@json_endpoint
def sweep():
    confirm_write_access()

    services = Service.query \
        .filter(Service.scim_enabled == True) \
        .filter(Service.sweep_scim_enabled == True) \
        .all()  # noqa: E712
    for service in services:
        service.sweep_scim_last_run = None
        db.session.merge(service)
    db.session.commit()

    return scim_sweep_services(current_app), 200
