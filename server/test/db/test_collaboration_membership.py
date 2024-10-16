import datetime
from unittest import TestCase

from server.db.domain import CollaborationMembership
from server.tools import dt_now


class TestCollaborationMembership(TestCase):

    def test_expired(self):
        collaboration_membership = CollaborationMembership()
        self.assertFalse(collaboration_membership.is_expired())

        now = dt_now()
        collaboration_membership.expiry_date = now + datetime.timedelta(days=50)
        self.assertFalse(collaboration_membership.is_expired())

        collaboration_membership.expiry_date = now - datetime.timedelta(days=50)
        self.assertTrue(collaboration_membership.is_expired())
