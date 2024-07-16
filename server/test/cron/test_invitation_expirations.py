import datetime

from server.cron.invitation_expirations import invitation_expirations
from server.db.db import db
from server.db.defaults import STATUS_OPEN, STATUS_EXPIRED
from server.db.domain import Invitation, ServiceInvitation, \
    OrganisationInvitation
from server.test.abstract_test import AbstractTest
from server.tools import dt_now


class TestExpirationReminders(AbstractTest):

    def _setup_data(self):
        now = dt_now()
        cfq = self.app.app_config.invitation_expirations
        # Will cause reminders mail
        expiry_date = now - datetime.timedelta(days=cfq.nbr_days_remove_expired_invitations + 2)
        for clazz in [Invitation, OrganisationInvitation, ServiceInvitation]:
            for invitation in clazz.query.all():
                if invitation.invitee_email in ["ufra@ex.org"]:
                    invitation.expiry_date = now + datetime.timedelta(days=15)
                    invitation.reminder_send = False
                else:
                    invitation.expiry_date = expiry_date
                    invitation.reminder_send = True
                db.session.merge(invitation)
        db.session.commit()

    def test_schedule(self):
        self._setup_data()

        results = invitation_expirations(self.app)
        self.assertEqual(2, len(results["invitations"]))
        self.assertEqual(0, len(results["api_invitations"]))
        self.assertEqual(2, len(results["organisation_invitations"]))
        self.assertEqual(2, len(results["service_invitations"]))
        invitation = Invitation.query.filter(Invitation.created_by == "system").one()
        self.assertEqual(STATUS_EXPIRED, invitation.status)

        # Set the API created invitation with an expiry_date far in the past
        invitation.expiry_date = dt_now() - datetime.timedelta(days=100)
        invitation.status = STATUS_OPEN
        db.session.merge(invitation)
        db.session.commit()

        results = invitation_expirations(self.app)
        self.assertEqual(0, len(results["invitations"]))
        self.assertEqual(1, len(results["api_invitations"]))
        self.assertEqual(0, len(results["organisation_invitations"]))
        self.assertEqual(0, len(results["service_invitations"]))

    def test_system_invitation_reminders(self):
        self._setup_data()

        results = self.put("/api/system/invitation_expirations")

        self.assertEqual(2, len(results["invitations"]))
        self.assertEqual(0, len(results["api_invitations"]))
        self.assertEqual(2, len(results["organisation_invitations"]))
        self.assertEqual(2, len(results["service_invitations"]))
