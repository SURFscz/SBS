import datetime
import logging
import time

from server.cron.shared import obtain_lock
from server.db.db import db
from server.db.defaults import STATUS_OPEN, STATUS_EXPIRED
from server.db.domain import Invitation, OrganisationInvitation, ServiceInvitation
from server.tools import dt_now

invitation_expirations_lock_name = "invitation_expirations_lock_name"


def _result_container():
    return {
        "invitations": [],
        "api_invitations": [],
        "organisation_invitations": [],
        "service_invitations": []
    }


def _do_invitation_expirations(app):
    with app.app_context():
        cfq = app.app_config.invitation_expirations

        now = dt_now()

        start = int(time.time() * 1000.0)
        logger = logging.getLogger("scheduler")
        logger.info("Start running invitation_expirations job")

        expired_threshold_date = now - datetime.timedelta(days=cfq.nbr_days_remove_expired_invitations)
        results = _result_container()

        invitation_dict = {"invitations": Invitation,
                           "organisation_invitations": OrganisationInvitation,
                           "service_invitations": ServiceInvitation}
        for name, clazz in invitation_dict.items():

            invitations = clazz.query \
                .filter(clazz.expiry_date < expired_threshold_date) \
                .filter(clazz.reminder_send == True) \
                .all()  # noqa: E712

            for invitation in invitations:
                if name == "invitations" and invitation.created_by == "system" and invitation.status == STATUS_OPEN:
                    invitation.status = STATUS_EXPIRED
                    db.session.merge(invitation)

                    logger.info(f"Marking {name} as expired  for {invitation.invitee_email}")
                else:
                    results[name].append(invitation.invitee_email)
                    db.session.delete(invitation)

                    logger.info(f"Deleting {name} for {invitation.invitee_email}")

        expired_api_threshold_date = now - datetime.timedelta(days=cfq.nbr_days_remove_api_expired_invitations)

        api_invitations = Invitation.query \
            .filter(Invitation.created_by == "system") \
            .filter(Invitation.expiry_date < expired_api_threshold_date) \
            .filter(Invitation.reminder_send == True) \
            .all()  # noqa: E712

        for api_invitation in api_invitations:
            results["api_invitations"].append(api_invitation.invitee_email)
            db.session.delete(api_invitation)

            logger.info("Deleting API invitation for {api_invitation.invitee_email}")

        db.session.commit()

        end = int(time.time() * 1000.0)
        logger.info(f"Result for invitation_expirations job: {results}")
        logger.info(f"Finished running invitation_expirations job in {end - start} ms")

        return results


def invitation_expirations(app):
    return obtain_lock(app, invitation_expirations_lock_name, _do_invitation_expirations, _result_container)
