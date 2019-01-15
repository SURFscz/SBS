from threading import Thread

from flask import current_app, render_template
from flask_mail import Message


def _send_async_email(ctx, msg, mail):
    with ctx:
        mail.send(msg)


def _do_send_mail(subject, recipients, template, context):
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))
    msg = Message(subject=subject, sender=("SURFnet", "no-reply@surfnet.nl"),
                  recipients=recipients)
    msg.html = render_template(f"{template}.html", **context)
    ctx = current_app.app_context()
    thr = Thread(target=_send_async_email, args=[ctx, msg, current_app.mail])
    thr.start()

    return msg.html


def mail_collaboration_join_request(context, collaboration, recipients):
    return _do_send_mail(
        subject=f"Join request for collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_join_request",
        context=context
    )


def mail_accepted_declined_join_request(context, join_request, accepted, recipients):
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Join request for collaboration {join_request.collaboration.name} has been {part}",
        recipients=recipients,
        template=f"join_request_{part}",
        context=context
    )
