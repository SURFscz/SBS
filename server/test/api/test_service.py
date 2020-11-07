# -*- coding: future_fstrings -*-
from server.db.domain import Service, Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_network_entity_id, amsterdam_uva_name, uuc_name, \
    service_network_name, uuc_scheduler_name


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

    def test_find_by_id_access_allowed_through_organisation_collaboration_memberships(self):
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        self.login("urn:betty")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_entity_id(self):
        res = self.get("api/services/find_by_entity_id", query_data={"entity_id": service_network_entity_id})

        self.assertEqual(res["name"], service_network_name)
        self.assertEqual(uuc_name, res["allowed_organisations"][0]["name"])

    def test_my_services(self):
        self.login("urn:sarah")
        res = self.get("api/services/my_services")
        self.assertEqual(6, len(res))

    def test_service_new(self):
        service = self.post("/api/services", body={
            "entity_id": "https://new_service", "name": "new_service",
            "ip_networks": [{"network_value": "2001:db8:f00f:bab::/64"}, {"network_value": "192.0.2.0/24"}]
        })

        self.assertIsNotNone(service["id"])
        self.assertEqual("new_service", service["name"])
        self.assertEqual(2, len(service["ip_networks"]))
        self.assertEqual("2001:db8:f00f:bab::/64", service["ip_networks"][0]["network_value"])

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
        service = self._find_by_name()
        service["name"] = "changed"
        service["ip_networks"] = [{"network_value": "192.0.2.0/24"}]

        service = self.put("/api/services", body=service)
        self.assertEqual("changed", service["name"])
        self.assertEqual(1, len(service["ip_networks"]))

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

    def test_services_all(self):
        self.login("urn:sarah")
        services = self.get("/api/services/all",
                            with_basic_auth=False)
        self.assertEqual(8, len(services))

        service_mail = self.find_by_name(services, service_mail_name)
        self.assertEqual(1, service_mail["collaborations_count"])
        self.assertEqual(0, len(service_mail["allowed_organisations"]))

        service_uuc = self.find_by_name(services, uuc_scheduler_name)
        self.assertEqual(1, service_uuc["organisations_count"])
        self.assertEqual(1, len(service_uuc["allowed_organisations"]))

    def test_add_allowed_organisations(self):
        service = self.find_entity_by_name(Service, service_network_name)
        uva = self.find_entity_by_name(Organisation, amsterdam_uva_name)
        self.put(f"/api/services/allowed_organisations/{service.id}",
                 body={"allowed_organisations": [{"organisation_id": uva.id}]})

        service = self.find_entity_by_name(Service, service_network_name)
        allowed_organisations = service.allowed_organisations

        self.assertEqual(1, len(allowed_organisations))
        self.assertEqual(amsterdam_uva_name, allowed_organisations[0].name)
