# -*- coding: future_fstrings -*-
import atexit
import datetime
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from server.db.db import db
from server.db.domain import User, SuspendNotification
from server.mail import mail_suspend_notification


def create_suspend_notification(user, retention, app, is_primary):
    suspend_notification = SuspendNotification(user=user, sent_at=datetime.datetime.utcnow(),
                                               is_primary=is_primary)
    db.session.merge(suspend_notification)
    mail_suspend_notification({"salutation": f"Dear {user.name}",
                               "base_url": app.app_config.base_url,
                               "retention": retention,
                               "suspend_notification": suspend_notification
                               },
                              [user.email], is_primary, False)


def suspend_users(app):
    with app.app_context():
        retention = app.app_config.retention
        current_time = datetime.datetime.utcnow()
        retention_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days)

        users = User.query \
            .filter(User.last_login_date < retention_date, User.suspended == False).all()  # noqa: E402
        for user in users:
            suspend_notifications = user.suspend_notifications
            if len(suspend_notifications) == 0:
                create_suspend_notification(user, retention, app, True)
            elif len(suspend_notifications) == 1:
                suspend_notification = suspend_notifications[0]
                days = retention.reminder_expiry_period_days - retention.reminder_resent_period_days
                if suspend_notification.sent_at < current_time - datetime.timedelta(days=days):
                    create_suspend_notification(user, retention, app, False)
            else:
                suspend_notification = list(filter(lambda sn: not sn.is_primary, suspend_notifications))[0]
                days = retention.reminder_resent_period_days
                if suspend_notification.sent_at < current_time - datetime.timedelta(days=days):
                    user.suspended = True
                    db.session.merge(user)

        if len(users) > 0:
            db.session.commit()


def start_scheduling(app):
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=suspend_users, trigger="cron", kwargs={"app": app}, day="*")
    scheduler.start()

    logger = logging.getLogger("scheduler")
    jobs = scheduler.get_jobs()
    logger.info(f"Running next suspend_users job at {jobs[0].next_run_time}")

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())
    return scheduler
