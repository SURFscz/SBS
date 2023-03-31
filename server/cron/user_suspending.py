import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import User, SuspendNotification, UserNameHistory
from server.mail import mail_suspend_notification, mail_suspended_account_deletion, format_date_time

suspend_users_lock_name = "suspend_users_lock"


def create_suspend_notification(user, retention, app, is_warning, is_suspension):
    suspend_notification = SuspendNotification(user=user,
                                               sent_at=datetime.datetime.utcnow(),
                                               is_warning=is_warning,
                                               is_suspension=is_suspension)
    user.suspend_notifications.append(suspend_notification)
    db.session.merge(user)

    logger = logging.getLogger("scheduler")
    logger.info(f"Sending suspend notification (warning: {is_warning}, is_suspension={is_suspension}) to "
                f"user {user.email} because last_login_date is {user.last_login_date}")
    current_time = datetime.datetime.utcnow()
    suspension_date = current_time + datetime.timedelta(days=retention.reminder_suspend_period_days)
    deletion_days = retention.remove_suspended_users_period_days + retention.reminder_suspend_period_days \
                    + retention.reminder_expiry_period_days
    if is_warning and not is_suspension:
        deletion_days -= retention.reminder_suspend_period_days
        deletion_days -= retention.remove_suspended_users_period_days
    if not is_warning and is_suspension:
        deletion_days -= retention.reminder_suspend_period_days
    deletion_date = current_time + datetime.timedelta(days=deletion_days)
    mail_suspend_notification({"salutation": f"Hi {user.given_name}",
                               "base_url": app.app_config.base_url,
                               "retention": retention,
                               "days_ago": (datetime.datetime.utcnow() - user.last_login_date).days,
                               "suspend_notification": suspend_notification,
                               "suspension_date": format_date_time(suspension_date),
                               "deletion_date": format_date_time(deletion_date),
                               "user": user
                               },
                              [user.email], is_warning, is_suspension)


def _result_container():
    return {
        "warning_suspend_notifications": [],
        "suspended_notifications": [],
        "warning_deleted_notifications": [],
        "deleted_notifications": []
    }


def _do_suspend_users(app):
    with app.app_context():
        retention = app.app_config.retention

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running suspend_users job")

        current_time = datetime.datetime.utcnow()
        suspension_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days)
        warning_date = suspension_date + datetime.timedelta(days=retention.reminder_suspend_period_days)

        results = _result_container()

        users = User.query \
            .filter(User.last_login_date < warning_date, User.suspended == False).all()  # noqa: E712
        for user in users:
            suspend_notifications = user.suspend_notifications
            if len(suspend_notifications) == 0:
                create_suspend_notification(user, retention, app, True, True)
                results["warning_suspend_notifications"].append(user.email)
            elif user.last_login_date < suspension_date:
                logger.info(f"Suspending user {user.email} because of inactivity")
                user.suspended = True
                create_suspend_notification(user, retention, app, False, True)
                results["suspended_notifications"].append(user.email)

        deletion_date = current_time - datetime.timedelta(days=retention.remove_suspended_users_period_days)
        warning_date = deletion_date + datetime.timedelta(days=retention.reminder_expiry_period_days)
        suspended_users = User.query \
            .filter(User.last_login_date < warning_date, User.suspended == True, ).all()  # noqa: E712
        for user in suspended_users:
            suspend_notifications = user.suspend_notifications
            if not any([not sp.is_suspension and sp.is_warning for sp in suspend_notifications]):
                create_suspend_notification(user, retention, app, True, False)
                results["warning_deleted_notifications"].append(user.email)
            elif user.last_login_date < deletion_date:
                # don't send mail to user; they have already received 3 emails, and this one is not actionable.
                results["deleted_notifications"].append(user.email)
                if user.username:
                    history_not_exists = UserNameHistory.query.filter(
                        UserNameHistory.username == user.username).count() == 0
                    if history_not_exists:
                        user_name_history = UserNameHistory(username=user.username)
                        db.session.merge(user_name_history)
                mail_suspended_account_deletion(user)
                db.session.delete(user)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running suspend_users job in {end - start} ms")

        return results


def suspend_users(app):
    return obtain_lock(app, suspend_users_lock_name, _do_suspend_users, _result_container)
