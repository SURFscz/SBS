import datetime
import logging
import time

from sqlalchemy import desc

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.domain import User, SuspendNotification, UserNameHistory
from server.mail import (mail_suspend_notification, mail_suspended_account_deletion, format_date_time,
                         mail_suspended_account_admin_notification)
from server.tools import dt_today, dt_now

suspend_users_lock_name = "suspend_users_lock"


def create_suspend_notification(user, retention, app, is_warning, is_suspension):
    suspend_notification = SuspendNotification(user=user,
                                               sent_at=dt_now(),
                                               is_warning=is_warning,
                                               is_suspension=is_suspension)
    db.session.add(suspend_notification)
    # user.suspend_notifications.append(suspend_notification)
    db.session.merge(user)

    logger = logging.getLogger("scheduler")
    logger.info(f"Sending suspend notification (warning: {is_warning}, is_suspension={is_suspension}) to "
                f"user {user.email} because last_login_date is {user.last_login_date}")
    current_time = dt_today()
    suspension_date = current_time + datetime.timedelta(days=retention.reminder_suspend_period_days)
    deletion_days = (
            retention.remove_suspended_users_period_days
            + retention.reminder_suspend_period_days
            + retention.reminder_expiry_period_days
    )
    if is_warning and not is_suspension:
        deletion_days -= retention.reminder_suspend_period_days
        deletion_days -= retention.remove_suspended_users_period_days
    if not is_warning and is_suspension:
        deletion_days -= retention.reminder_suspend_period_days
    deletion_date = current_time + datetime.timedelta(days=deletion_days)
    mail_suspend_notification({"salutation": f"Hi {user.given_name}",
                               "base_url": app.app_config.base_url,
                               "retention": retention,
                               "days_ago": (dt_today() - user.last_login_date).days,
                               "suspend_notification": suspend_notification,
                               "suspension_date": format_date_time(suspension_date),
                               "deletion_date": format_date_time(deletion_date),
                               "user": user,
                               "support_address": app.app_config.mail.info_email,
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

        current_time = dt_today()
        # users who have been inactive since this date will be suspended
        suspension_date = current_time - datetime.timedelta(days=retention.allowed_inactive_period_days)
        # users who have been inactive since this date will get a first suspension warning
        suspension_warning_date = suspension_date + datetime.timedelta(days=retention.reminder_suspend_period_days)
        # suspension warnings that have been sent before this date are considered "old" and can be acted upon
        warning_timeout = current_time - datetime.timedelta(days=retention.reminder_suspend_period_days)

        results = _result_container()

        # note: we handle the following progression here:
        #  - at warning_date = allowed_inactive_period_days-reminder_suspend_period_days after the last login,
        #    a user is warned about pending suspension
        #  - at reminder_suspend_period_days after the warning _and_ allowed_inactive_period_days after the last login,
        #    a user's account is suspended
        #  - at remove_suspended_users_period_days-reminder_expiry_period_days after suspension, a
        #    user is warned about pending deletion
        #  - at reminder_expiry_period_days after the reminder _and_ remove_suspended_users_period_days after suspension,
        #    a user is deleted

        # first, we handle suspension and warning about suspension
        # concretely:
        # - look at all users who haven't logged in since warning_date
        # - if the user has not yet gotten a notification (or very long ago), send a warning
        # - otherwise, suspend the user only if the user hasn't logged in since suspension_date and
        #   the warning was sent at least reminder_suspend_period_days days ago
        excluded_user_accounts = [user.uid for user in app.app_config.excluded_user_accounts]

        users = User.query \
            .filter(User.last_login_date < suspension_warning_date, User.suspended == False) \
            .filter(User.uid.not_in(excluded_user_accounts)) \
            .all()  # noqa: E712
        for user in users:
            last_suspend_notification = SuspendNotification.query.filter(
                SuspendNotification.user == user,
                SuspendNotification.is_warning.is_(True),
                SuspendNotification.is_suspension.is_(True)
            ).order_by(desc(SuspendNotification.sent_at)).first()

            if last_suspend_notification is None or last_suspend_notification.sent_at < suspension_warning_date:
                # no recent reminder, sent one first
                logger.info(f"Sending suspension reminder to user {user.uid} ({user.email})")
                create_suspend_notification(user, retention, app, True, True)
                results["warning_suspend_notifications"].append(user.email)
            elif user.last_login_date < suspension_date < last_suspend_notification.sent_at < warning_timeout:
                # user has gotten reminder, and we've waited long enough
                logger.info(f"Suspending user {user.uid} ({user.email}) because of inactivity")
                user.suspended = True
                create_suspend_notification(user, retention, app, False, True)
                results["suspended_notifications"].append(user.email)

        # now handle deletion of suspended users.
        # concretely:
        # - look at suspended users
        # - if suspension was (remove_suspended_users_period_days - reminder_expiry_period_days) days ago,
        #   and last login was (allowed_inactive_period_days+remove_suspended_users_period_days
        #   -reminder_expiry_period_days) days ago, and no deletion reminder was sent recently,
        #   send deletion reminder
        # - if deletion reminder was reminder_expiry_period_days ago, and last login was
        #   (allowed_inactive_period_days+remove_suspended_users_period_days) days ago, delete user

        # users who have been inactive since this date can be deleted
        deletion_date = (
                current_time
                - datetime.timedelta(days=retention.allowed_inactive_period_days)
                - datetime.timedelta(days=retention.remove_suspended_users_period_days)
        )
        # users who have been inactive since this date will get a first deletion warning
        deletion_warning_date = deletion_date + datetime.timedelta(days=retention.reminder_expiry_period_days)
        # users who have been suspended since this date can be warned about deletion
        suspension_timeout = (
                current_time
                - datetime.timedelta(days=retention.remove_suspended_users_period_days)
                + datetime.timedelta(days=retention.reminder_expiry_period_days)
        )
        # deletion warnings that have been sent before this date are considered "old" and can be acted upon
        warning_timeout = current_time - datetime.timedelta(days=retention.reminder_expiry_period_days)
        suspended_users = User.query \
            .filter(User.last_login_date < deletion_warning_date, User.suspended == True) \
            .filter(User.uid.not_in(excluded_user_accounts)) \
            .all()  # noqa: E712
        deleted_user_uids = []
        for user in suspended_users:
            last_suspend_notification = SuspendNotification.query.filter(
                SuspendNotification.user == user,
                SuspendNotification.is_warning.is_(False),
                SuspendNotification.is_suspension.is_(True)
            ).order_by(desc(SuspendNotification.sent_at)).first()
            last_delete_warning = SuspendNotification.query.filter(
                SuspendNotification.user == user,
                SuspendNotification.is_warning.is_(True),
                SuspendNotification.is_suspension.is_(False)
            ).order_by(desc(SuspendNotification.sent_at)).first()  # noqa: E712

            if last_suspend_notification is None:
                raise Exception(f"User {user.uid} ({user.uid}) is suspended but has no suspension notification."
                                "This should not happen.")
            if last_suspend_notification.sent_at > suspension_timeout:
                continue  # user suspended too recently, don't delete yet

            if last_delete_warning is None or last_delete_warning.sent_at < suspension_date:
                # no recent deletion warning, sent one first
                logger.info(f"Sending deletion reminder to user {user.uid} ({user.email})")
                create_suspend_notification(user, retention, app, True, False)
                results["warning_deleted_notifications"].append(user.email)
            elif user.last_login_date < deletion_date < last_delete_warning.sent_at < warning_timeout:
                # don't send mail to user; they have already received 3 emails, and this one is not actionable.
                logger.info(f"Deleting user {user.uid} ({user.email}) because of inactivity")
                results["deleted_notifications"].append(user.email)
                deleted_user_uids.append(user.uid)
                if user.username:
                    history_not_exists = UserNameHistory.query.filter(
                        UserNameHistory.username == user.username).count() == 0
                    if history_not_exists:
                        user_name_history = UserNameHistory(username=user.username)
                        db.session.merge(user_name_history)
                db.session.delete(user)

        db.session.commit()

        if deleted_user_uids:
            mail_suspended_account_deletion(deleted_user_uids)

        if retention.admin_notification_mail and any(results.values()):
            mail_suspended_account_admin_notification(results, [
                suspension_warning_date,
                suspension_date,
                deletion_warning_date,
                deletion_date
            ])

        end = int(time.time() * 1000.0)
        logger.info(f"Finished running suspend_users job in {end - start} ms")

        return results


def suspend_users(app):
    return obtain_lock(app, suspend_users_lock_name, _do_suspend_users, _result_container)
