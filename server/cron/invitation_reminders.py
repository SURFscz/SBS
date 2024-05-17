import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_OPEN
from server.db.domain import Invitation, OrganisationInvitation, ServiceInvitation
from server.mail import mail_service_invitation, mail_collaboration_invitation, \
    mail_organisation_invitation
from server.tools import dt_now

invitation_reminders_lock_name = "invitation_reminders_lock_name"


def _result_container():
    return {
        "invitations": [],
        "organisation_invitations": [],
        "service_invitations": []
    }


def _do_invitation_reminders(app):
    with app.app_context():
        cfq = app.app_config.invitation_reminders

        now = dt_now()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running invitation_reminders job")

        reminder_date = now + datetime.timedelta(days=cfq.invitation_reminders_threshold)
        results = _result_container()

        invitations = Invitation.query \
            .filter(Invitation.status == STATUS_OPEN) \
            .filter(Invitation.expiry_date < reminder_date) \
            .filter(Invitation.expiry_date > now) \
            .filter(Invitation.reminder_send == False) \
            .all()  # noqa: E712

        for invitation in invitations:
            invitation.reminder_send = True
            db.session.merge(invitation)

            results["invitations"].append(invitation.invitee_email)
            logger.info(f"Sending reminder for CO invitation to {invitation.invitee_email}")

            mail_collaboration_invitation({
                "salutation": "Dear",
                "invitation": invitation,
                "base_url": app.app_config.base_url,
                "wiki_link": app.app_config.wiki_link,
                "recipient": invitation.invitee_email
            }, invitation.collaboration, [invitation.invitee_email], reminder=True,
                preview=False, working_outside_of_request_context=True)

        organisation_invitations = OrganisationInvitation.query \
            .filter(OrganisationInvitation.expiry_date < reminder_date) \
            .filter(OrganisationInvitation.reminder_send == False) \
            .all()  # noqa: E712
        for invitation in organisation_invitations:
            invitation.reminder_send = True
            db.session.merge(invitation)

            results["organisation_invitations"].append(invitation.invitee_email)
            logger.info(f"Sending reminder for Org invitation to {invitation.invitee_email}")

            mail_organisation_invitation({
                "salutation": "Dear",
                "invitation": invitation,
                "base_url": app.app_config.base_url,
                "recipient": invitation.invitee_email
            }, invitation.organisation, [invitation.invitee_email], reminder=True,
                working_outside_of_request_context=True)

        service_invitations = ServiceInvitation.query \
            .filter(ServiceInvitation.expiry_date < reminder_date) \
            .filter(ServiceInvitation.reminder_send == False) \
            .all()  # noqa: E712
        for invitation in service_invitations:
            invitation.reminder_send = True
            db.session.merge(invitation)

            results["service_invitations"].append(invitation.invitee_email)
            logger.info(f"Sending reminder for Service invitation to {invitation.invitee_email}")

            mail_service_invitation({
                "salutation": "Dear",
                "invitation": invitation,
                "base_url": app.app_config.base_url,
                "intended_role": invitation.intended_role,
                "recipient": invitation.invitee_email
            }, invitation.service, [invitation.invitee_email], reminder=True,
                working_outside_of_request_context=True)

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Result for invitation_reminders job: {results}")
        logger.info(f"Finished running invitation_reminders job in {end - start} ms")

        return results


def invitation_reminders(app):
    return obtain_lock(app, invitation_reminders_lock_name, _do_invitation_reminders, _result_container)
