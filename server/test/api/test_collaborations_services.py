# -*- coding: future_fstrings -*-
import json

from server.db.db import db
from server.db.domain import Service, Collaboration
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_mail_name, ai_computing_name, service_cloud_name, uva_research_name, \
    service_network_name, service_wiki_name, uuc_secret, service_group_wiki_name


class TestCollaborationsServices(AbstractTest):

    def _find_service_by_name(self, name=service_mail_name):
        service = Service.query.filter(Service.name == name).one()
        return self.get(f"api/services/{service.id}")

    def test_delete_collaborations_services(self):
        self.login("urn:john")
        service_mail = self._find_service_by_name(service_mail_name)
        self.assertTrue(len(service_mail["collaborations"]) > 0)

        collaboration_id = service_mail["collaborations"][0]["id"]
        service_id = service_mail["id"]
        response = self.client.delete(f"api/collaborations_services/{collaboration_id}/{service_id}",
                                      headers=BASIC_AUTH_HEADER,
                                      content_type="application/json")
        self.assertEqual(204, response.status_code)

    def test_delete_collaborations_services_forbidden(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        self.mark_collaboration_service_restricted(collaboration_id)
        service_id = self.find_entity_by_name(Service, service_mail_name).id

        self.delete(f"api/collaborations_services/{collaboration_id}/{service_id}",
                    with_basic_auth=False, response_status_code=403)

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

    def test_add_collaborations_services_with_service_groups(self):
        self.login("urn:john")
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(2, len(collaboration.groups))
        collaboration_id = collaboration.id
        service_wiki = self.find_entity_by_name(Service, service_wiki_name)
        service_wiki.automatic_connection_allowed = True
        db.session.merge(service_wiki)
        db.session.commit()

        service_wiki_id = service_wiki.id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_wiki_id
        })
        # Reload
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(3, len(collaboration.groups))
        group = list(filter(lambda item: item.name == service_group_wiki_name, collaboration.groups))[0]
        self.assertEqual(0, len(group.collaboration_memberships))

    def test_add_collaborations_services_forbidden(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        self.mark_collaboration_service_restricted(collaboration_id)
        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        }, with_basic_auth=False, response_status_code=403)

    def test_add_collaborations_not_correct_organisation_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        service_id = self.find_entity_by_name(Service, service_network_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertEqual("not_allowed_organisation", res["message"])

    def test_add_collaborations_no_automatic_connection_allowed(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        service_id = self.find_entity_by_name(Service, service_wiki_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertEqual("automatic_connection_not_allowed", res["message"])

    def test_delete_all_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        self.delete("/api/collaborations_services/delete_all_services", primary_key=collaboration_id,
                    with_basic_auth=False)
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(0, len(collaboration["services"]))

    def test_delete_all_services_forbidden(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        self.mark_collaboration_service_restricted(collaboration_id)

        self.delete("/api/collaborations_services/delete_all_services", primary_key=collaboration_id,
                    with_basic_auth=False, response_status_code=403)

    def test_connect_collaboration_service(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {uuc_secret}"},
                              data=json.dumps({
                                  "collaboration_id": collaboration_id,
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual("connected", res.json["status"])

        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(3, len(collaboration["services"]))

    def test_connect_collaboration_service_forbidden(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        self.mark_collaboration_service_restricted(collaboration_id)

        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        self.put("/api/collaborations_services/v1/connect_collaboration_service",
                 with_basic_auth=False,
                 body=json.dumps({
                     "collaboration_id": collaboration_id,
                     "service_entity_id": service_cloud.entity_id
                 }),
                 response_status_code=403)

    def test_connect_collaboration_service_collaboration_not_in_organisation(self):
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)

        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {uuc_secret}"},
                              data=json.dumps({
                                  "collaboration_id": collaboration_id,
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual(res.status_code, 403)
        error_dict = res.json
        self.assertTrue("is not part of organisation" in error_dict["message"])

    def test_connect_collaboration_service_collaboration_no_external_api_call(self):
        res = self.put("/api/collaborations_services/v1/connect_collaboration_service", response_status_code=403)
        self.assertEqual("Not a valid external API call", res["message"])
