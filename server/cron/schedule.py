import atexit
import threading

from apscheduler.schedulers.background import BackgroundScheduler

from server.cron.cleanup_non_open_requests import cleanup_non_open_requests
from server.cron.collaboration_expiration import expire_collaborations
from server.cron.collaboration_inactivity_suspension import suspend_collaborations
from server.cron.idp_metadata_parser import parse_idp_metadata
from server.cron.membership_expiration import expire_memberships
from server.cron.orphan_users import delete_orphan_users
from server.cron.outstanding_requests import outstanding_requests
from server.cron.scim_sweep_services import scim_sweep_services
from server.cron.user_suspending import suspend_users


def start_scheduling(app):
    scheduler = BackgroundScheduler()
    cfq = app.app_config
    retention = cfq.retention
    options = {"trigger": "cron", "kwargs": {"app": app}, "day": "*", "timezone": 'UTC',
               "misfire_grace_time": 60 * 60 * 12, "coalesce": True}
    scheduler.add_job(func=suspend_users, hour=retention.cron_hour_of_day, **options)
    scheduler.add_job(func=parse_idp_metadata, hour=retention.cron_hour_of_day, **options)
    sweep_services_options = {**options, **{"hour": "*", "minute": "*/15"}}
    scheduler.add_job(func=scim_sweep_services, **sweep_services_options)

    if cfq.platform_admin_notifications.enabled:
        scheduler.add_job(func=outstanding_requests, hour=cfq.platform_admin_notifications.cron_hour_of_day, **options)
    if cfq.collaboration_expiration.enabled:
        scheduler.add_job(func=expire_collaborations, hour=cfq.collaboration_expiration.cron_hour_of_day, **options)
    if cfq.collaboration_suspension.enabled:
        scheduler.add_job(func=suspend_collaborations, hour=cfq.collaboration_suspension.cron_hour_of_day, **options)
    if cfq.membership_expiration.enabled:
        scheduler.add_job(func=expire_memberships, hour=cfq.membership_expiration.cron_hour_of_day, **options)
    if cfq.user_requests_retention.enabled:
        scheduler.add_job(func=cleanup_non_open_requests, hour=cfq.user_requests_retention.cron_hour_of_day, **options)
    if cfq.orphan_users.enabled:
        scheduler.add_job(func=delete_orphan_users, hour=cfq.orphan_users.cron_hour_of_day, **options)

    if cfq.metadata.get("parse_at_startup", False):
        threading.Thread(target=parse_idp_metadata, args=(app,)).start()

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())
    app.scheduler = scheduler
    # Otherwise no jobs will run
    scheduler.start()
    return scheduler
