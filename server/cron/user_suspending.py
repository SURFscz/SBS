# -*- coding: future_fstrings -*-
import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import User, SuspendNotification, UserNameHistory
from server.mail import mail_suspend_notification, mail_suspended_account_deletion

suspend_users_lock_name = "suspend_users_lock"


def create_suspend_notification(user, retention, app, is_primary):
    suspend_notification = SuspendNotification(user=user, sent_at=datetime.datetime.utcnow(),
                                               is_primary=is_primary)
    user.suspend_notifications.append(suspend_notification)
    db.session.merge(user)
    today = datetime.date.today()
    days = retention.reminder_resent_period_days if is_primary else retention.reminder_expiry_period_days
    suspension_date = today + datetime.timedelta(days=days)

    lsn = len(user.suspend_notifications)
    count = "first" if lsn == 1 else "second" if lsn == 2 else "third"

    logger = logging.getLogger("scheduler")
    logger.info(f"Sending {count} suspend notification to user {user.email} because last_login_date "
                f"is {str(user.last_login_date)}")

    mail_suspend_notification({"salutation": f"Hi {user.given_name}",
                               "base_url": app.app_config.base_url,
                               "retention": retention,
                               "suspension_date": str(suspension_date),
                               "suspend_notification": suspend_notification,
                               "user": user
                               },
                              [user.email], is_primary, False)


def _result_container():
    return {
        "first_suspend_notification": [],
        "second_suspend_notification": [],
        "suspended": [],
        "deleted": []
    }


def _do_suspend_users(app):
    with app.app_context():
        retention = app.app_config.retention
        current_time = datetime.datetime.utcnow()
        retention_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days)

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running suspend_users job")

        results = _result_container()

        users = User.query \
            .filter(User.last_login_date < retention_date, User.suspended == False).all()  # noqa: E712
        for user in users:
            suspend_notifications = user.suspend_notifications
            if len(suspend_notifications) == 0:
                create_suspend_notification(user, retention, app, True)
                results["first_suspend_notification"].append(user.email)
            elif len(suspend_notifications) == 1:
                suspend_notification = suspend_notifications[0]
                days = retention.reminder_expiry_period_days - retention.reminder_resent_period_days
                if suspend_notification.sent_at < current_time - datetime.timedelta(days=days):
                    create_suspend_notification(user, retention, app, False)
                    results["second_suspend_notification"].append(user.email)
            else:
                suspend_notification = list(filter(lambda sn: not sn.is_primary, suspend_notifications))[0]
                days = retention.reminder_resent_period_days
                days_ = current_time - datetime.timedelta(days=days)
                if suspend_notification.sent_at < days_:
                    user.suspended = True

                    logger.info(f"Suspending user {user.email}, last suspend_notification.sent_at is "
                                f"{str(suspend_notification.sent_at)} and before retention date {str(days_)}")

                    db.session.merge(user)
                    results["suspended"].append(user.email)

        deletion_date = current_time - datetime.timedelta(days=retention.remove_suspended_users_period_days)
        suspended_users = User.query \
            .filter(User.last_login_date < deletion_date, User.suspended == True, ).all()  # noqa: E712
        for user in suspended_users:
            results["deleted"].append(user.email)
            if user.username:
                history_not_exists = UserNameHistory.query.filter(
                    UserNameHistory.username == user.username).count() == 0
                if history_not_exists:
                    user_name_history = UserNameHistory(username=user.username)
                    db.session.merge(user_name_history)
            mail_suspended_account_deletion(user)
            db.session.delete(user)

        if len(users) > 0 or len(suspended_users) > 0:
            db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running suspend_users job in {end - start} ms")

        return results


def suspend_users(app, wait_time=3):
    return obtain_lock(app, suspend_users_lock_name, _do_suspend_users, _result_container, wait_time=wait_time)
