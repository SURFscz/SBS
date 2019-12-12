# -*- coding: future_fstrings -*-
from server.db.domain import Service, Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_network_entity_id, amsterdam_uva_name, uuc_name


class TestService(AbstractTest):

    def _find_by_name(self, name=service_mail_name):
        service = self.find_entity_by_name(Service, name)
        return self.get(f"api/services/{service.id}")

    def test_search(self):
        res = self.get("/api/services/search", query_data={"q": "networ"})
        self.assertEqual(2, len(res))

    def test_search_wildcard(self):
        res = self.get("/api/services/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_search_forbidden(self):
        self.login("urn:roger")
        self.get("/api/services/search", query_data={"q": "networ"}, response_status_code=403)

    def test_find_by_id_forbidden(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:roger")
        self.get(f"api/services/{service.id}", response_status_code=403, with_basic_auth=False)

    def test_find_by_id_access_allowed(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:sarah")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_service_new(self):
        service = self.post("/api/services", body={"entity_id": "https://new_service", "name": "new_service"})
        self.assertIsNotNone(service["id"])
        self.assertEqual("new_service", service["name"])

    def test_service_new_with_allowed_organisations(self):
        uva_id = self.find_entity_by_name(Organisation, amsterdam_uva_name).id
        uuc_id = self.find_entity_by_name(Organisation, uuc_name).id
        allowed_organisations = [{"organisation_id": uva_id}, {"organisation_id": uuc_id}]
        service = self.post("/api/services", body={"entity_id": "https://new_service", "name": "new_service",
                                                   "allowed_organisations": allowed_organisations})
        self.assertIsNotNone(service["id"])
        self.assertEqual("new_service", service["name"])

        service = self.find_entity_by_name(Service, "new_service")
        self.assertEqual(2, len(service.allowed_organisations))

    def test_service_update(self):
        mail = self._find_by_name()
        mail["name"] = "changed"
        service = self.put("/api/services", body=mail)
        self.assertEqual("changed", service["name"])

    def test_service_delete(self):
        pre_count = Service.query.count()
        mail = self._find_by_name()
        self.delete("/api/services", primary_key=mail["id"])
        post_count = Service.query.count()
        self.assertEqual(pre_count - 1, post_count)

    def test_service_name_exists(self):
        res = self.get("/api/services/name_exists", query_data={"name": service_mail_name})
        self.assertEqual(True, res)

        res = self.get("/api/services/name_exists",
                       query_data={"name": service_mail_name, "existing_service": service_mail_name.upper()})
        self.assertEqual(False, res)

        res = self.get("/api/services/name_exists", query_data={"name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/services/name_exists", query_data={"name": "xyc", "existing_service": "xyc"})
        self.assertEqual(False, res)

    def test_service_entity_id_exists(self):
        res = self.get("/api/services/entity_id_exists", query_data={"entity_id": service_network_entity_id})
        self.assertEqual(True, res)

        res = self.get("/api/services/entity_id_exists",
                       query_data={"entity_id": "https://uuc", "existing_service": service_network_entity_id.upper()})
        self.assertEqual(False, res)

        res = self.get("/api/services/entity_id_exists", query_data={"entity_id": "https://xyz"})
        self.assertEqual(False, res)

        res = self.get("/api/services/entity_id_exists",
                       query_data={"entity_id": "https://xyz", "existing_service": "https://xyz"})
        self.assertEqual(False, res)
