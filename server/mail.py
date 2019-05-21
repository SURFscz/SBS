# -*- coding: future_fstrings -*-
from threading import Thread

from flask import current_app, render_template
from flask_mail import Message


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


def _do_send_mail(subject, recipients, template, context):
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))
    msg = Message(subject=subject, sender=("SURFnet", "no-reply@surfnet.nl"),
                  recipients=recipients)
    msg.html = render_template(f"{template}.html", **context)

    mail = current_app.mail
    ctx = current_app.app_context()
    thr = Thread(target=_send_async_email, args=[ctx, msg, mail])
    thr.start()

    if current_app.config["OPEN_MAIL_IN_BROWSER"]:
        _open_mail_in_browser(msg.html)
    return msg.html


def mail_collaboration_join_request(context, collaboration, recipients):
    return _do_send_mail(
        subject=f"Join request for collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_join_request",
        context=context
    )


def mail_organisation_invitation(context, organisation, recipients):
    return _do_send_mail(
        subject=f"Invitation to join organisation {organisation.name}",
        recipients=recipients,
        template="organisation_invitation",
        context=context
    )


def mail_collaboration_invitation(context, collaboration, recipients):
    return _do_send_mail(
        subject=f"Invitation to join collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_invitation",
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
