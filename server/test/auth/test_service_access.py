import datetime

from server.auth.service_access import has_user_access_to_service, collaboration_memberships_for_service
from server.db.domain import User, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_cloud_name
from server.tools import dt_now


class TestServiceAccess(AbstractTest):

    def test_has_user_access_to_service(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        user = self.find_entity_by_name(User, "Roger Doe")
        self.assertTrue(has_user_access_to_service(service, user))

        collaboration = user.collaboration_memberships[0].collaboration
        collaboration.expiry_date = dt_now() - datetime.timedelta(hours=12)
        self.save_entity(collaboration)
        self.assertFalse(has_user_access_to_service(service, user))

        user = self.find_entity_by_name(User, "betty")
        self.assertFalse(has_user_access_to_service(service, user))

        # based on the schac_home and crm_organisation of cloud
        user = self.find_entity_by_name(User, "James Byrd")
        self.assertTrue(has_user_access_to_service(service, user))

    def test_has_user_access_to_service_hygiene(self):
        user = User()
        service = Service()
        self.assertFalse(has_user_access_to_service(None, None))
        self.assertFalse(has_user_access_to_service(None, user))
        self.assertFalse(has_user_access_to_service(service, None))
        service.non_member_users_access_allowed = True
        self.assertTrue(has_user_access_to_service(service, user))

    def test_collaboration_memberships_for_service_hygiene(self):
        self.assertFalse(collaboration_memberships_for_service(None, None))
        self.assertFalse(collaboration_memberships_for_service(None, User(suspended=True)))
