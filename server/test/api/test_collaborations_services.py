from server.db.db import Service, Collaboration
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_mail_name, ai_computing_name, service_cloud_name, service_wireless_name


class TestCollaborationsServices(AbstractTest):

    def _find_service_by_name(self, name=service_mail_name):
        service = Service.query.filter(Service.name == name).one()
        return self.get(f"api/services/{service.id}")

    def test_delete_collaborations_services(self):
        service_mail = self._find_service_by_name(service_mail_name)
        self.assertTrue(len(service_mail["collaborations"]) > 0)
        collaboration_id = service_mail["collaborations"][0]["id"]
        service_id = service_mail["id"]
        response = self.client.delete(f"api/collaborations_services/{collaboration_id}/{service_id}",
                                      headers=BASIC_AUTH_HEADER,
                                      content_type="application/json")
        self.assertEqual(204, response.status_code)

    def test_add_collaborations_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id
        service_wireless_id = self.find_entity_by_name(Service, service_wireless_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_ids": [service_cloud_id, service_wireless_id]
        })
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(4, len(collaboration["services"]))

    def test_add_collaborations_empty_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_ids": []
        }, response_status_code=201)

    def test_add_all_collaborations_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        service_ids = list(map(lambda service: service.id, Service.query.all()))
        self.assertEqual(6, len(service_ids))

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_ids": service_ids
        })
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(len(service_ids), len(collaboration["services"]))

    def test_delete_all_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        self.delete("/api/collaborations_services/delete_all_services", primary_key=collaboration_id)
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(0, len(collaboration["services"]))
