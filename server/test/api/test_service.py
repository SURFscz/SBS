from server.db.db import Service
from server.test.abstract_test import AbstractTest


class TestService(AbstractTest):

    def _find_mail_by_entity_id(self):
        return self.get("/api/service/find_by_entity", query_data={"entity_id": "https://mail"})

    def test_find_by_entity_id(self):
        mail = self._find_mail_by_entity_id()
        self.assertEqual("mail", mail["name"])

    def test_find_by_non_existing_entity_id(self):
        self.get("/api/service/find_by_entity", query_data={"entity_id": "nope"}, response_status_code=500)

    def test_service_new(self):
        service = self.post("/api/service", body={"entity_id": "https://new_service", "name": "new_service"})
        self.assertIsNotNone(service["id"])
        self.assertEqual("new_service", service["name"])

    def test_service_update(self):
        mail = self._find_mail_by_entity_id()
        mail["name"] = "changed"
        service = self.put("/api/service", body=mail)
        self.assertEqual("changed", service["name"])

    def test_service_delete(self):
        mail = self._find_mail_by_entity_id()
        self.delete("/api/service", primary_key=mail["id"])
        self.assertEqual(1, Service.query.count())
