import datetime
import logging
import os
import uuid
from threading import Thread

from flask import current_app, render_template
from flask_mail import Message

from server.auth.security import current_user_id
from server.db.db import db
from server.db.defaults import calculate_expiry_period
from server.db.domain import User, UserMail
from server.logger.context_logger import ctx_logger
from server.mail_types.mail_types import COLLABORATION_REQUEST_MAIL, \
    COLLABORATION_JOIN_REQUEST_MAIL, AUTOMATIC_COLLABORATION_JOIN_REQUEST_MAIL, ORGANISATION_INVITATION_MAIL, \
    COLLABORATION_INVITATION_MAIL, ACCEPTED_JOIN_REQUEST_MAIL, DENIED_JOIN_REQUEST_MAIL, \
    ACCEPTED_COLLABORATION_REQUEST_MAIL, DENIED_COLLABORATION_REQUEST_MAIL, SERVICE_CONNECTION_REQUEST_MAIL, \
    ACCEPTED_SERVICE_CONNECTTION_REQUEST_MAIL, DENIED_SERVICE_CONNECTTION_REQUEST_MAIL, SUSPEND_NOTIFICATION_MAIL, \
    RESET_MFA_TOKEN_MAIL, COLLABORATION_EXPIRES_WARNING_MAIL, \
    COLLABORATION_EXPIRED_NOTIFICATION_MAIL, COLLABORATION_SUSPENDED_NOTIFICATION_MAIL, \
    COLLABORATION_SUSPENSION_WARNING_MAIL, MEMBERSHIP_EXPIRED_NOTIFICATION_MAIL, MEMBERSHIP_EXPIRES_WARNING_MAIL, \
    SERVICE_INVITATION_MAIL


def _send_async_email(ctx, msg, mail):
    with ctx:
        mail.send(msg)


def _open_mail_in_browser(msg):
    import tempfile
    import webbrowser

    tmp = tempfile.NamedTemporaryFile(delete=False)
    path = tmp.name + ".html"

    f = open(path, "w")
    f.write(msg.html)
    f.close()
    webbrowser.open("file://" + path)


def _user_attributes(user: User):
    return {
        "uid": user.uid,
        "name": user.name,
        "username": user.username,
        "affiliation": user.affiliation,
        "scoped_affiliation": user.scoped_affiliation,
        "entitlement": user.entitlement,
        "schac_home_organisation": user.schac_home_organisation,
        "family_name": user.family_name,
        "given_name": user.given_name,
        "email": user.email,
        "eduperson_principal_name": user.eduperson_principal_name
    }


def _do_send_mail(subject, recipients, template, context, preview, working_outside_of_request_context=False, cc=None):
    recipients = recipients if isinstance(recipients, list) else list(
        map(lambda x: x.strip(), recipients.split(",")))

    mail_ctx = current_app.app_config.mail
    environment = mail_ctx.environment
    if environment != "sram.surf.nl":
        subject = f"{subject} ({environment})"
    msg = Message(subject=subject,
                  sender=(mail_ctx.get("sender_name", "SURF"), mail_ctx.get("sender_email", "no-reply@surf.nl")),
                  recipients=recipients,
                  cc=cc,
                  extra_headers={
                      "Auto-submitted": "auto-generated",
                      "X-Auto-Response-Suppress": "yes",
                      "Precedence": "bulk"
                  })
    context = {**context, **{"environment": environment}}
    msg.html = render_template(f"{template}.html", **context)
    msg.body = render_template(f"{template}.txt", **context)
    msg.msgId = f"<{str(uuid.uuid4())}@{os.uname()[1]}.internal.sram.surf.nl>".replace("-", ".")

    logger = logging.getLogger("mail") if working_outside_of_request_context else ctx_logger("user")
    logger.debug(f"Sending mail message to {','.join(recipients)} with Message-id {msg.msgId}")

    suppress_mail = "suppress_sending_mails" in mail_ctx and mail_ctx.suppress_sending_mails
    open_mail_in_browser = current_app.config["OPEN_MAIL_IN_BROWSER"]

    if not preview and not suppress_mail and not open_mail_in_browser:
        mail = current_app.mail
        if "TESTING" in os.environ:
            mail.send(msg)
        else:
            ctx = current_app.app_context()
            thr = Thread(target=_send_async_email, args=[ctx, msg, mail])
            thr.start()

    if suppress_mail and not preview:
        logger.info(f"Sending mail {msg.html}")

    if open_mail_in_browser and not preview:
        _open_mail_in_browser(msg)
    return msg.html


def _store_mail(user, mail_type, recipients):
    recipient = ",".join(recipients) if isinstance(recipients, list) else recipients
    user_id = None if not user else user.id if hasattr(user, "id") else user["id"]
    user_mail = UserMail(user_id=user_id, name=mail_type, recipient=recipient)
    db.session.merge(user_mail)
    db.session.commit()


def _get_coll_emails(collaboration, mail_type, membership=None, include_org_members=True):
    coll_admins = [m.user for m in collaboration.collaboration_memberships if m.role == "admin"]
    if include_org_members:
        coll_admins += [m.user for m in collaboration.organisation.organisation_memberships]
    if membership:
        coll_admins.append(membership.user)
    emails = [r.email for r in coll_admins]
    for r in coll_admins:
        _store_mail(r, mail_type, emails)
    return emails


def _format_date_time(date_time_instance):
    return date_time_instance.strftime("%b %d %Y") if date_time_instance else ""


def mail_collaboration_join_request(context, collaboration, recipients, preview=False):
    if not preview:
        _store_mail(context["user"], COLLABORATION_JOIN_REQUEST_MAIL, recipients)
    return _do_send_mail(
        subject=f"Join request for collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_join_request",
        context=context,
        preview=preview
    )


def mail_collaboration_request(context, collaboration_request, recipients, preview=False):
    if not preview:
        _store_mail(context["user"], COLLABORATION_REQUEST_MAIL, recipients)
    return _do_send_mail(
        subject=f"Request for new collaboration {collaboration_request.name}",
        recipients=recipients,
        template="collaboration_request",
        context=context,
        preview=preview
    )


def mail_automatic_collaboration_request(context, collaboration, organisation, recipients, preview=False):
    if not preview:
        _store_mail(context["user"], AUTOMATIC_COLLABORATION_JOIN_REQUEST_MAIL, recipients)
    return _do_send_mail(
        subject=f"New collaboration {collaboration.name} created in {organisation.name}",
        recipients=recipients,
        template="automatic_collaboration_request",
        context=context,
        preview=preview
    )


def mail_organisation_invitation(context, organisation, recipients, preview=False):
    if not preview:
        _store_mail(None, ORGANISATION_INVITATION_MAIL, recipients)
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
    if not preview:
        _store_mail(None, COLLABORATION_INVITATION_MAIL, recipients)
    invitation = context["invitation"]
    # TODO https://stackoverflow.com/questions/55271348/sending-email-with-inline-images-flask-mail
    message = invitation.message.replace("\n", "<br/>") if invitation.message else None
    context = {**context, "expiry_period": calculate_expiry_period(invitation),
               "collaboration": collaboration, "organisation_img_link": collaboration.organisation.logo,
               "message": message}

    return _do_send_mail(
        subject=f"Invitation to join collaboration {collaboration.name}",
        recipients=recipients,
        template="collaboration_invitation",
        context=context,
        preview=preview
    )


def mail_service_invitation(context, service, recipients, preview=False):
    if not preview:
        _store_mail(None, SERVICE_INVITATION_MAIL, recipients)
    context = {**context, **{"expiry_period": calculate_expiry_period(context["invitation"])},
               "service": service}
    return _do_send_mail(
        subject=f"Invitation to become service admin for {service.name}",
        recipients=recipients,
        template="service_invitation",
        context=context,
        preview=preview
    )


def mail_accepted_declined_join_request(context, join_request, accepted, recipients, preview=False):
    if not preview:
        _store_mail(context["user"], ACCEPTED_JOIN_REQUEST_MAIL if accepted else DENIED_JOIN_REQUEST_MAIL, recipients)
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
    if not preview:
        _store_mail(context["user"],
                    ACCEPTED_COLLABORATION_REQUEST_MAIL if accepted else DENIED_COLLABORATION_REQUEST_MAIL,
                    recipients)
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Collaboration request for collaboration {collaboration_name} has been {part}",
        recipients=recipients,
        template=f"collaboration_request_{part}",
        context={**context,
                 **{"admins": [m.user for m in organisation.organisation_memberships if m.role == "admin"]}},
        preview=preview
    )


def mail_service_connection_request(context, service_name, collaboration_name, recipients, is_admin, cc=None,
                                    preview=False):
    if not preview:
        _store_mail(context["user"], SERVICE_CONNECTION_REQUEST_MAIL, recipients)
    template = "service_connection_request" if is_admin else "service_connection_request_collaboration_admin"
    return _do_send_mail(
        subject=f"Request for new service {service_name} connection to collaboration {collaboration_name}",
        recipients=recipients,
        cc=cc,
        template=template,
        context=context,
        preview=preview
    )


def mail_accepted_declined_service_connection_request(context, service_name, collaboration_name, accepted, recipients,
                                                      preview=False):
    if not preview:
        _store_mail(context["user"],
                    ACCEPTED_SERVICE_CONNECTTION_REQUEST_MAIL if accepted else DENIED_SERVICE_CONNECTTION_REQUEST_MAIL,
                    recipients)
    part = "accepted" if accepted else "declined"
    return _do_send_mail(
        subject=f"Service {service_name} connection request for collaboration {collaboration_name} has been {part}",
        recipients=recipients,
        template=f"service_connection_request_{part}",
        context=context,
        preview=preview
    )


def mail_suspend_notification(context, recipients, is_primary, preview=False):
    if not preview:
        _store_mail(context["user"], SUSPEND_NOTIFICATION_MAIL, recipients)
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
        context={"environment": environment, "tb": tb, "date": datetime.datetime.now(), "current_user": current_user},
        preview=False)


def mail_feedback(environment, message, current_user, recipients):
    _store_mail(current_user, SUSPEND_NOTIFICATION_MAIL, recipients)
    return _do_send_mail(
        subject=f"Feedback on {environment} from {current_user.name}",
        recipients=recipients,
        template="feedback",
        context={"environment": environment, "message": message, "date": datetime.datetime.now(),
                 "current_user": current_user},
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
                     "date": datetime.datetime.now(),
                     "object_type": type(obj).__name__,
                     "current_user": current_user,
                     "obj": obj},
            preview=False,
            working_outside_of_request_context=True
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
                 "base_url": current_app.app_config.base_url,
                 "collaboration_join_requests": collaboration_join_requests,
                 "collaboration_requests": collaboration_requests},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_account_deletion(user):
    mail_cfg = current_app.app_config.mail
    recipients = [mail_cfg.eduteams_email]
    if mail_cfg.account_deletion_notifications_enabled:
        recipients.append(mail_cfg.beheer_email)
    _do_send_mail(
        subject=f"User {user.email} has deleted their account in environment {mail_cfg.environment}",
        recipients=recipients,
        template="user_account_deleted",
        context={"environment": mail_cfg.environment,
                 "date": datetime.datetime.now(),
                 "attributes": _user_attributes(user),
                 "user": user},
        preview=False
    )


def mail_suspended_account_deletion(user):
    mail_cfg = current_app.app_config.mail
    recipients = [mail_cfg.eduteams_email]
    if mail_cfg.account_deletion_notifications_enabled:
        recipients.append(mail_cfg.beheer_email)
    _do_send_mail(
        subject=f"User {user.email} suspended account is deleted in environment {mail_cfg.environment}",
        recipients=recipients,
        template="suspended_user_account_deleted",
        context={"environment": mail_cfg.environment,
                 "date": datetime.datetime.now(),
                 "attributes": _user_attributes(user),
                 "user": user},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_reset_token(admin_email, user, message):
    _store_mail(user, RESET_MFA_TOKEN_MAIL, admin_email)
    _do_send_mail(
        subject=f"User {user.email} has requested a second-factor authentication reset",
        recipients=[admin_email],
        template="user_reset_mfa_token",
        context={"user": user, "message": message},
        preview=False
    )


def mail_collaboration_expires_notification(collaboration, is_warning):
    mail_type = COLLABORATION_EXPIRES_WARNING_MAIL if is_warning else COLLABORATION_EXPIRED_NOTIFICATION_MAIL
    recipients = _get_coll_emails(collaboration, mail_type)

    threshold = current_app.app_config.collaboration_expiration.expired_warning_mail_days_threshold
    if is_warning:
        subject = f"Collaboration {collaboration.name} will expire in {threshold} days"
    else:
        subject = f"Collaboration {collaboration.name} has expired"
    _do_send_mail(
        subject=subject,
        recipients=recipients,
        template="collaboration_expires_warning" if is_warning else "collaboration_expired_notification",
        context={"salutation": "Dear", "collaboration": collaboration,
                 "base_url": current_app.app_config.base_url,
                 "expiry_date": _format_date_time(collaboration.expiry_date)},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_collaboration_suspension_notification(collaboration, is_warning):
    mail_type = COLLABORATION_SUSPENDED_NOTIFICATION_MAIL if is_warning else COLLABORATION_SUSPENSION_WARNING_MAIL
    recipients = _get_coll_emails(collaboration, mail_type)

    cfq = current_app.app_config.collaboration_suspension
    threshold = cfq.inactivity_warning_mail_days_threshold
    if is_warning:
        subject = f"Collaboration {collaboration.name} will be suspended in {threshold} days"
    else:
        subject = f"Collaboration {collaboration.name} has been suspended"
    now = datetime.datetime.utcnow()
    suspension_date = _format_date_time(now + datetime.timedelta(days=cfq.inactivity_warning_mail_days_threshold))
    _do_send_mail(
        subject=subject,
        recipients=recipients,
        template="collaboration_suspension_warning" if is_warning else "collaboration_suspensed_notification",
        context={"salutation": "Dear", "now": _format_date_time(now), "collaboration": collaboration,
                 "base_url": current_app.app_config.base_url,
                 "suspension_date": suspension_date},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_membership_expires_notification(membership, is_warning):
    mail_type = MEMBERSHIP_EXPIRES_WARNING_MAIL if is_warning else MEMBERSHIP_EXPIRED_NOTIFICATION_MAIL
    recipients = _get_coll_emails(membership.collaboration, mail_type, membership=membership, include_org_members=False)

    threshold = current_app.app_config.membership_expiration.expired_warning_mail_days_threshold
    if is_warning:
        subject = f"Membership of {membership.collaboration.name} will expire in {threshold} days"
    else:
        subject = f"Membership of {membership.collaboration.name} has expired"
    _do_send_mail(
        subject=subject,
        recipients=recipients,
        template="membership_expires_warning" if is_warning else "membership_expired_notification",
        context={"salutation": "Dear", "membership": membership,
                 "base_url": current_app.app_config.base_url,
                 "expiry_date": _format_date_time(membership.expiry_date)},
        preview=False,
        working_outside_of_request_context=True
    )


def mail_membership_orphan_users_deleted(users):
    mail_cfg = current_app.app_config.mail
    _do_send_mail(
        subject="Account SRAM deleted",
        recipients=[mail_cfg.eduteams_email],
        cc=[mail_cfg.beheer_email],
        template="orphan_user_delete",
        context={"environment": mail_cfg.environment,
                 "users": users,
                 "base_url": current_app.app_config.base_url},
        preview=False,
        working_outside_of_request_context=True
    )
