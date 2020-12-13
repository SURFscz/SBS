# -*- coding: future_fstrings -*-
import atexit
import logging
import threading

from apscheduler.schedulers.background import BackgroundScheduler

from server.cron.idp_metadata_parser import parse_idp_metadata
from server.cron.user_suspending import suspend_users


def start_scheduling(app):
    scheduler = BackgroundScheduler()
    retention = app.app_config.retention
    scheduler.add_job(func=suspend_users, trigger="cron", kwargs={"app": app}, day="*", hour=retention.cron_hour_of_day)
    scheduler.add_job(func=parse_idp_metadata, trigger="cron", kwargs={"app": app}, day="*",
                      hour=retention.cron_hour_of_day)
    scheduler.start()

    logger = logging.getLogger("scheduler")
    jobs = scheduler.get_jobs()

    logger.info(f"Running next suspend_users job at {jobs[0].next_run_time}")
    logger.info(f"Running next parse_idp_metadata job at {jobs[1].next_run_time}")

    if app.app_config.metadata.get("parse_at_startup", False):
        threading.Thread(target=parse_idp_metadata, args=(app,)).start()

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())
    return scheduler
