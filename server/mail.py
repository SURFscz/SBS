# -*- coding: future_fstrings -*-
import logging
import os
import uuid
from datetime import datetime
from threading import Thread

from flask import current_app, render_template
from flask_mail import Message

from server.auth.security import current_user_id
from server.db.defaults import calculate_expiry_period
from server.db.domain import User
from server.logger.context_logger import ctx_logger


def _send_async_email(ctx, msg, mail):
    with ctx:
        mail.send(msg)


def _open_mail_in_browser(html):
    import tempfile
    import webbrowser

    tmp = tempfile.NamedTemporaryFile(delete=False)
    path = tmp.name + ".html"

    f = open(path, "w")
    f.write(html)
    f.close()
    webbrowser.open("file://" + path)


def _do_send_mail(subject, recipients, template, context, preview, working_outside_of_request_context=False):
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))

    mail_ctx = current_app.app_config.mail
    msg = Message(subject=subject,
                  sender=(mail_ctx.get("sender_name", "SURF"), mail_ctx.get("sender_email", "no-reply@surf.nl")),
                  recipients=recipients,
                  extra_headers={
                      "Auto-submitted": "auto-generated",
                      "X-Auto-Response-Suppress": "yes",
                      "Precedence": "bulk"
                  })
    msg.html = render_template(f"{template}.html", **context)
    msg.body = render_template(f"{template}.txt", **context)
    msg.msgId = f"<{str(uuid.uuid4())}@{os.uname()[1]}.internal.sram.surf.nl>".replace("-", ".")

    logger = logging.getLogger("mail") if working_outside_of_request_context else ctx_logger("user")
    logger.debug(f"Sending mail message with Message-id {msg.msgId}")

    suppress_mail = "suppress_sending_mails" in mail_ctx and mail_ctx.suppress_sending_mails
    open_mail_in_browser = current_app.config["OPEN_MAIL_IN_BROWSER"]

    if not preview and not suppress_mail and not open_mail_in_browser:
        mail = current_app.mail
        ctx = current_app.app_context()
        thr = Thread(target=_send_async_email, args=[ctx, msg, mail])
        thr.start()

    if suppress_mail and not preview:
        logger.info(f"Sending mail {msg.html}")

    if open_mail_in_browser and not preview:
        _open_mail_in_browser(msg.html)
    return msg.html


def mail_collaboration_join_request(context, collaboration, recipients, preview=False):
    return _do_send_mail(
        subject=f"Join request for collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_join_request",
        context=context,
        preview=preview
    )


def mail_collaboration_request(context, collaboration_request, recipients, preview=False):
    return _do_send_mail(
        subject=f"Request for new collaboration {collaboration_request.name}",
        recipients=recipients,
        template="collaboration_request",
        context=context,
        preview=preview
    )


def mail_automatic_collaboration_request(context, collaboration, organisation, recipients, preview=False):
    return _do_send_mail(
        subject=f"New collaboration {collaboration.name} created in {organisation.name}",
        recipients=recipients,
        template="automatic_collaboration_request",
        context=context,
        preview=preview
    )


def mail_organisation_invitation(context, organisation, recipients, preview=False):
    context = {**context, **{"expiry_period": calculate_expiry_period(context["invitation"])},
               "organisation": organisation}
    return _do_send_mail(
        subject=f"Invitation to join organisation {organisation.name}",
        recipients=recipients,
        template="organisation_invitation",
        context=context,
        preview=preview
    )


def mail_collaboration_invitation(context, collaboration, recipients, preview=False):
    context = {**context, **{"expiry_period": calculate_expiry_period(context["invitation"])},
               "collaboration": collaboration}
    return _do_send_mail(
        subject=f"Invitation to join collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_invitation",
        context=context,
        preview=preview
    )


def mail_accepted_declined_join_request(context, join_request, accepted, recipients, preview=False):
    part = "accepted" if accepted else "declined"
    admins = [m.user for m in join_request.collaboration.collaboration_memberships if m.role == "admin"]
    return _do_send_mail(
        subject=f"Join request for collaboration {join_request.collaboration.name} has been {part}",
        recipients=recipients,
        template=f"join_request_{part}",
        context={**context,
                 **{"admins": admins}},
        preview=preview
    )


def mail_accepted_declined_collaboration_request(context, collaboration_name, organisation, accepted, recipients,
                                                 preview=False):
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Collaboration request for collaboration {collaboration_name} has been {part}",
        recipients=recipients,
        template=f"collaboration_request_{part}",
        context={**context,
                 **{"admins":
                        [m.user for m in organisation.organisation_memberships if m.role == "admin"]}},

        preview=preview
    )


def mail_service_connection_request(context, service_name, collaboration_name, recipients, is_admin, preview=False):
    template = "service_connection_request" if is_admin else "service_connection_request_collaboration_admin"
    return _do_send_mail(
        subject=f"Request for new service {service_name} connection to collaboration {collaboration_name}",
        recipients=recipients,
        template=template,
        context=context,
        preview=preview
    )


def mail_accepted_declined_service_connection_request(context, service_name, collaboration_name, accepted, recipients,
                                                      preview=False):
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Service {service_name} connection request for collaboration {collaboration_name} has been {part}",
        recipients=recipients,
        template=f"service_connection_request_{part}",
        context=context,
        preview=preview
    )


def mail_suspend_notification(context, recipients, is_primary, preview=False):
    return _do_send_mail(
        subject="SURF SRAM: suspend notification",
        recipients=recipients,
        template="suspend_notification" if is_primary else "suspend_notification_reminder",
        context=context,
        preview=preview,
        working_outside_of_request_context=True
    )


def mail_error(environment, current_user, recipients, tb):
    return _do_send_mail(
        subject=f"Error on {environment}",
        recipients=recipients,
        template="error_notification",
        context={"environment": environment, "tb": tb, "date": datetime.now(), "current_user": current_user},
        preview=False)


def mail_feedback(environment, message, current_user, recipients):
    return _do_send_mail(
        subject=f"Feedback on {environment} from {current_user.name}",
        recipients=recipients,
        template="feedback",
        context={"environment": environment, "message": message, "date": datetime.now(), "current_user": current_user},
        preview=False)


def mail_platform_admins(obj):
    mail_cfg = current_app.app_config.mail
    if mail_cfg.audit_trail_notifications_enabled:
        current_user = User.query.get(current_user_id())
        _do_send_mail(
            subject=f"New {type(obj).__name__} ({obj.name}) created by {current_user.name}"
                    f" in environment {mail_cfg.environment}",
            recipients=[mail_cfg.beheer_email],
            template="platform_notification",
            context={"environment": mail_cfg.environment,
                     "date": datetime.now(),
                     "object_type": type(obj).__name__,
                     "current_user": current_user,
                     "obj": obj},
            preview=False
        )


def mail_outstanding_requests(collaboration_requests, collaboration_join_requests):
    mail_cfg = current_app.app_config.mail
    admin_cfg = current_app.app_config.platform_admin_notifications
    _do_send_mail(
        subject=f"Daily outstanding requests in environment {mail_cfg.environment}",
        recipients=[mail_cfg.beheer_email],
        template="platform_notification_outstanding_requests",
        context={"environment": mail_cfg.environment,
                 "admin_cfg": admin_cfg,
                 "collaboration_join_requests": collaboration_join_requests,
                 "collaboration_requests": collaboration_requests},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_account_deletion(user):
    mail_cfg = current_app.app_config.mail
    if mail_cfg.account_deletion_notifications_enabled:
        _do_send_mail(
            subject=f"User {user.email} has deleted his/ hers accoun in environment {mail_cfg.environment}",
            recipients=[mail_cfg.beheer_email],
            template="user_account_deleted",
            context={"environment": mail_cfg.environment,
                     "date": datetime.now(),
                     "user": user},
            preview=False
        )


def mail_reset_token(admin_email, user, message):
    _do_send_mail(
        subject=f"User {user.email} has requested a seconf-factor authentication reset",
        recipients=[admin_email],
        template="user_reset_mfa_token",
        context={"user": user, "message": message},
        preview=False
    )
