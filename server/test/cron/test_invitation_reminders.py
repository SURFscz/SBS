import datetime

from server.cron.invitation_reminders import invitation_reminders
from server.db.db import db
from server.db.defaults import STATUS_OPEN
from server.db.domain import Invitation, ServiceInvitation, \
    OrganisationInvitation
from server.test.abstract_test import AbstractTest
from server.tools import dt_now


class TestInvitationReminders(AbstractTest):

    def _setup_data(self):
        now = dt_now()
        cfq = self.app.app_config.invitation_reminders
        # Will cause reminders mail
        expiry_date = now + datetime.timedelta(days=cfq.invitation_reminders_threshold - 2)
        for invitation in Invitation.query.all():
            invitation.expiry_date = expiry_date
            invitation.status = STATUS_OPEN
            invitation.reminder_send = False
            db.session.merge(invitation)
        # Also mark one invitation with an expiry_date in the past, those should be ignored
        invitation = Invitation.query.first()
        invitation.expiry_date = now - datetime.timedelta(days=5)
        db.session.merge(invitation)

        for invitation in ServiceInvitation.query.all():
            invitation.expiry_date = expiry_date
            invitation.reminder_send = False
            db.session.merge(invitation)
        for invitation in OrganisationInvitation.query.all():
            invitation.expiry_date = expiry_date
            invitation.reminder_send = False
            db.session.merge(invitation)
        db.session.commit()

    def test_schedule(self):
        self._setup_data()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = invitation_reminders(self.app)
            self.assertEqual(3, len(results["invitations"]))
            self.assertEqual(2, len(results["organisation_invitations"]))
            self.assertEqual(2, len(results["service_invitations"]))
            self.assertEqual(7, len(outbox))

        results = invitation_reminders(self.app)
        self.assertEqual(0, len(results["invitations"]))
        self.assertEqual(0, len(results["organisation_invitations"]))
        self.assertEqual(0, len(results["service_invitations"]))

    def test_system_invitation_reminders(self):
        self._setup_data()

        results = self.put("/api/system/invitation_reminders")

        self.assertEqual(3, len(results["invitations"]))
        self.assertEqual(2, len(results["organisation_invitations"]))
        self.assertEqual(2, len(results["service_invitations"]))
