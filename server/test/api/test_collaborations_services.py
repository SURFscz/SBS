# -*- coding: future_fstrings -*-
from server.db.db import Service, Collaboration
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_mail_name, ai_computing_name, service_cloud_name, uva_research_name, \
    service_network_name, service_wiki_name


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

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        })
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(3, len(collaboration["services"]))

    def test_add_collaborations_not_correct_organisation_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        service_id = self.find_entity_by_name(Service, service_network_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertEqual("allowed_organisations", res["message"])

    def test_add_collaborations_no_automatic_connection_allowed(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        service_id = self.find_entity_by_name(Service, service_wiki_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertEqual("automatic_connection_allowed", res["message"])

    def test_delete_all_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        self.delete("/api/collaborations_services/delete_all_services", primary_key=collaboration_id)
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(0, len(collaboration["services"]))
