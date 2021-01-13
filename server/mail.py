# -*- coding: future_fstrings -*-
from datetime import datetime
from threading import Thread

from flask import current_app, render_template
from flask_mail import Message

from server.db.defaults import calculate_expiry_period
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


def _do_send_mail(subject, recipients, template, context, preview):
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))

    mail_ctx = current_app.app_config.mail
    msg = Message(subject=subject,
                  sender=(mail_ctx.get("sender_name", "SURFnet"), mail_ctx.get("sender_email", "no-reply@surfnet.nl")),
                  recipients=recipients)
    msg.html = render_template(f"{template}.html", **context)
    msg.body = render_template(f"{template}.txt", **context)

    suppress_mail = "suppress_sending_mails" in mail_ctx and mail_ctx.suppress_sending_mails
    open_mail_in_browser = current_app.config["OPEN_MAIL_IN_BROWSER"]

    if not preview and not suppress_mail and not open_mail_in_browser:
        mail = current_app.mail
        ctx = current_app.app_context()
        thr = Thread(target=_send_async_email, args=[ctx, msg, mail])
        thr.start()

    if suppress_mail and not preview:
        logger = ctx_logger("mail")
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
    return _do_send_mail(
        subject=f"Join request for collaboration {join_request.collaboration.name} has been {part}",
        recipients=recipients,
        template=f"join_request_{part}",
        context=context,
        preview=preview
    )


def mail_accepted_declined_collaboration_request(context, collaboration_name, accepted, recipients, preview=False):
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Collaboration request for collaboration {collaboration_name} has been {part}",
        recipients=recipients,
        template=f"collaboration_request_{part}",
        context=context,
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
        preview=preview
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
