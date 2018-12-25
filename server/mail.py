import os

from flask import current_app, render_template
from flask_mail import Message


def _do_send_mail(subject, recipients, template, context):
    if "TEST" in os.environ and os.environ["TEST"] == "1":
        return
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))
    msg = Message(subject=subject, sender=("SURFnet", "no-reply@surfnet.nl"),
                  recipients=recipients)
    msg.html = render_template(f"{template}.html", **context)
    current_app.mail.send(msg)
    return msg.html


def collaboration_invite(context, collaboration, recipients):
    return _do_send_mail(
        subject=f"Invitation to join collaboration {collaboration}",
        recipients=recipients,
        template="collaboration_invite",
        context=context
    )
