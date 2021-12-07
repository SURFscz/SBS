# -*- coding: future_fstrings -*-

from server.db.domain import User, Collaboration, ServiceAup, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name, invitation_hash_curious, service_mail_name


class TestServiceAup(AbstractTest):

    @staticmethod
    def _service_aups_by_user(uid):
        user_id = User.query.filter(User.uid == uid).one().id
        return ServiceAup.query.filter(ServiceAup.user_id == user_id).all()

    def test_accept(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        service_aups = self._service_aups_by_user("urn:james")
        self.assertEqual(4, len(service_aups))

    def test_delete_by_service(self):
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))

        self.login("urn:john")
        for service_aup in service_aups:
            self.put("/api/service_aups/delete_by_service", body={"service_id": service_aup.service.id})

        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(0, len(service_aups))

    def test_join_request(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.login("urn:betty")
        self.post("/api/join_requests",
                  body={"collaborationId": collaboration.id, "motivation": "please"},
                  with_basic_auth=False)
        service_aups = self._service_aups_by_user("urn:betty")
        self.assertEqual(4, len(service_aups))

    def test_create_service_aup(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:betty")
        self.post("/api/service_aups", body={"service_id": service.id})
        service_aups = self._service_aups_by_user("urn:betty")
        self.assertEqual(1, len(service_aups))
        self.assertEqual(service.name, service_aups[0].service.name)

    def test_create_service_aup_already_exists(self):
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))

        self.login("urn:admin")
        self.post("/api/service_aups", body={"service_id": service_aups[0].service.id})
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))
