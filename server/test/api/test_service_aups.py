
from server.db.domain import User, Collaboration, ServiceAup, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, invitation_hash_curious, service_mail_name


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
        self.login("urn:john")
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))
        service_ids = [service_aup.service.id for service_aup in service_aups]
        for service_id in service_ids:
            self.put("/api/service_aups/delete_by_service", body={"service_id": service_id})

        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(0, len(service_aups))

    def test_join_request(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.login("urn:james")
        self.post("/api/join_requests",
                  body={"collaborationId": collaboration.id, "motivation": "please"},
                  with_basic_auth=False)
        service_aups = self._service_aups_by_user("urn:james")
        self.assertEqual(4, len(service_aups))

    def test_create_service_aup(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:betty")
        self.post("/api/service_aups", body={"service_id": service.id})
        service_aups = self._service_aups_by_user("urn:betty")
        self.assertEqual(1, len(service_aups))
        self.assertEqual(service_mail_name, service_aups[0].service.name)

    def test_create_service_aup_already_exists(self):
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))

        self.login("urn:admin")
        self.post("/api/service_aups", body={"service_id": service_aups[0].service.id})
        service_aups = self._service_aups_by_user("urn:admin")
        self.assertEqual(2, len(service_aups))

    def test_create_service_aup_bulk(self):
        self.login("urn:peter")
        res = self.get("/api/users/me")
        self.assertEqual(2, len(res["services_without_aup"]))
        service_identifiers = [s["id"] for s in res["services_without_aup"]]

        res = self.post("/api/service_aups/bulk", body={"service_identifiers": service_identifiers})
        self.assertIsNone(res["location"])

        res = self.get("/api/users/me")
        self.assertEqual(0, len(res["services_without_aup"]))
