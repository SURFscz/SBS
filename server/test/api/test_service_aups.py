# -*- coding: future_fstrings -*-

from server.db.domain import User, Collaboration, ServiceAup
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name, invitation_hash_curious, service_network_name


class TestServiceAup(AbstractTest):

    def _service_aups_by_user(self, uid):
        user_id = User.query.filter(User.uid == uid).one().id
        return ServiceAup.query.filter(ServiceAup.user_id == user_id).all()

    def test_accept(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        service_aups = self._service_aups_by_user("urn:james")
        self.assertEqual(4, len(service_aups))

        network = [aup.service for aup in service_aups if aup.service.name == service_network_name][0]
        self.login("urn:service_admin")
        self.put("/api/service_aups/delete_by_service", body={"service_id": network.id})

        service_aups = self._service_aups_by_user("urn:james")
        self.assertEqual(3, len(service_aups))

    def test_join_request(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.login("urn:betty")
        self.post("/api/join_requests",
                  body={"collaborationId": collaboration.id, "motivation": "please"},
                  with_basic_auth=False)
        service_aups = self._service_aups_by_user("urn:betty")
        self.assertEqual(4, len(service_aups))
