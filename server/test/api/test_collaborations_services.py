import json

from server.db.db import db
from server.db.domain import Service, Collaboration
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_mail_name, co_ai_computing_name, service_cloud_name, co_research_name, \
    service_network_name, service_wiki_name, service_group_wiki_name1, service_group_wiki_name2, \
    co_robotics_disabled_join_request_name, unifra_secret, service_ssh_name, service_storage_name, \
    service_scheduler_name, \
    unihard_name, unihard_secret_unit_support


# there are a number of cases to test here:
#  (1) add a Service set to automatically connect from all Orgs (ok)
#  (2) add a Service set to allow service requests from all Orgs (fail with "automatic_connection_not_allowed")
#  (3) add a Service set to allow connection from this Org only (ok)
#  (4) add a Service set to allow service requests from this Org only (fail with "automatic_connection_not_allowed")
#  (5) add a Service set to disallow this organisation (fail with "not_allowed_organisation)

# and also:
#  (a) connecting service to restricted organisation (ok)
#  (b) connecting service to restricted organisation (fail with "Organisation {collaboration.organisation.name} can
#      only be linked to SURF services")

class TestCollaborationsServices(AbstractTest):

    def _find_service_by_name(self, name=service_mail_name):
        service = Service.query.filter(Service.name == name).one()
        return self.get(f"api/services/{service.id}")

    ###################################################################
    # Regular API tests
    ###################################################################

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

    def test_delete_collaborations_services_by_service_admin(self):
        self.login("urn:james")
        service = self._find_service_by_name(service_cloud_name)
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        response = self.client.delete(f"api/collaborations_services/{collaboration.id}/{service['id']}",
                                      headers=BASIC_AUTH_HEADER,
                                      content_type="application/json")
        self.assertEqual(204, response.status_code)

    # (1) add a Service set to automatically connect from all Orgs (ok)
    def test_add_collaborations_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        })
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(3, len(collaboration["services"]))

    #  (2) add a Service set to allow service requests from all Orgs (fail with "automatic_connection_not_allowed")
    def test_add_collaborations_no_automatic_connection_allowed(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        service_id = self.find_entity_by_name(Service, service_ssh_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertTrue("automatic_connection_not_allowed" in res["message"])

    #  (3) add a Service set to allow connection from this Org only (ok)
    def test_add_collaborations_automatic_connection_allowed_organisations(self):
        self.login("urn:john")
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_scheduler_name)

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration.id,
            "service_id": service.id
        })

    #  (4) add a Service set to allow service requests from this Org only (fail with "automatic_connection_not_allowed")
    def test_add_collaborations_no_automatic_connection_allowed_organisations(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        service_id = self.find_entity_by_name(Service, service_wiki_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertTrue("automatic_connection_not_allowed" in res["message"])

    #  (5) add a Service set to disallow this organisation (fail with "not_allowed_organisation)
    def test_add_collaborations_not_correct_organisation_services(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_research_name).id
        service = self.find_entity_by_name(Service, service_network_name)
        service.override_access_allowed_all_connections = 0
        self.save_entity(service)

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service.id
        }, response_status_code=400)

        self.assertTrue(res["error"])
        self.assertTrue("not_allowed_organisation" in res["message"])

    #  (a) connecting service to restricted organisation (ok)
    def test_add_collaborations_services_allowed(self):
        self.mark_organisation_service_restricted(unihard_name)
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        service_cloud_id = self.find_entity_by_name(Service, service_storage_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        })

    #  (b) connecting service to restricted organisation (fail with "Organisation {collaboration.organisation.name} can
    #      only be linked to SURF services")
    def test_add_collaborations_services_forbidden(self):
        self.mark_organisation_service_restricted(unihard_name)
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        # organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        }, with_basic_auth=False, response_status_code=400)
        self.assertIn(f"Organisation {unihard_name} can only be linked to SURF services", res["message"])

    ###################################################################
    # Service groups
    ###################################################################

    def test_add_collaborations_services_with_service_groups(self):
        self.login("urn:john")
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
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
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(4, len(collaboration.groups))
        groups = list(filter(lambda item: item.name == service_group_wiki_name1, collaboration.groups))
        self.assertEqual(1, len(groups))
        self.assertEqual(0, len(groups[0].collaboration_memberships))
        groups = list(filter(lambda item: item.name == service_group_wiki_name2, collaboration.groups))
        self.assertEqual(1, len(groups))

    ###################################################################
    # Organisation API tests
    ###################################################################

    # Org API
    def test_add_collaborations_services_with_automatic_connection_allowed_organisations(self):
        collaboration = self.find_entity_by_name(Collaboration, co_robotics_disabled_join_request_name)
        self.assertEqual(0, len(collaboration.services))

        service_wiki = self.find_entity_by_name(Service, service_wiki_name)
        self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                        headers={"Authorization": f"Bearer {unifra_secret}"},
                        data=json.dumps({
                            "short_name": collaboration.short_name,
                            "service_entity_id": service_wiki.entity_id
                        }), content_type="application/json")

        # Reload
        collaboration = self.find_entity_by_name(Collaboration, co_robotics_disabled_join_request_name)
        service_wiki = self.find_entity_by_name(Service, service_wiki_name)
        self.assertEqual(service_wiki.entity_id, collaboration.services[0].entity_id)

    # org api
    def test_connect_collaboration_service(self):
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        url = f"/api/collaborations_services/v1/connect_collaboration_service/{collaboration['identifier']}"
        res = self.client.put(url,
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual("connected", res.json["status"])

        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(3, len(collaboration["services"]))

    # org api
    def test_connect_collaboration_service_deprecated(self):
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(2, len(collaboration["services"]))

        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "short_name": collaboration["short_name"],
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual("connected", res.json["status"])

        collaboration = self.get(f"/api/collaborations/{collaboration_id}")
        self.assertEqual(3, len(collaboration["services"]))

    # org api
    def test_connect_collaboration_service_forbidden(self):
        self.mark_organisation_service_restricted(unihard_name)
        self.login("urn:admin")
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        short_name = collaboration.short_name

        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        self.put("/api/collaborations_services/v1/connect_collaboration_service",
                 with_basic_auth=False,
                 body={
                     "short_name": short_name,
                     "service_entity_id": service_cloud.entity_id
                 },
                 response_status_code=403)

    # org api
    def test_connect_collaboration_service_collaboration_not_in_organisation(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)

        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "short_name": collaboration.short_name,
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual(res.status_code, 403)
        error_dict = res.json
        self.assertTrue("is not part of organisation" in error_dict["message"])

    # org api
    def test_connect_collaboration_service_collaboration_no_external_api_call(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)

        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": "Bearer nope"},
                              data=json.dumps({
                                  "short_name": collaboration.short_name,
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual(res.status_code, 401)

    # org api
    def test_connect_collaboration_service_no_automatic_connection(self):
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        service_entity_id = service_cloud.entity_id

        service_cloud.automatic_connection_allowed = False
        db.session.merge(service_cloud)
        db.session.commit()

        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{collaboration_id}")

        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "short_name": collaboration["short_name"],
                                  "service_entity_id": service_entity_id
                              }), content_type="application/json")
        self.assertEqual("pending", res.json["status"])

    # org api
    def test_connect_collaboration_service_no_automatic_connection_no_admins(self):
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        service_entity_id = service_cloud.entity_id

        service_cloud.automatic_connection_allowed = False
        db.session.merge(service_cloud)

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        short_name = collaboration.short_name
        collaboration.collaboration_memberships.clear()
        db.session.merge(collaboration)
        db.session.commit()

        res = self.client.put("/api/collaborations_services/v1/connect_collaboration_service",
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "short_name": short_name,
                                  "service_entity_id": service_entity_id
                              }), content_type="application/json")
        self.assertTrue(f"Collaboration {short_name} has no administrator" in res.json["message"])

    # Org API
    def test_disconnect_collaborations_service(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.assertTrue(service in collaboration.services)
        url = f"/api/collaborations_services/v1/disconnect_collaboration_service/{collaboration.identifier}"
        res = self.client.put(url,
                              headers={"Authorization": f"Bearer {unifra_secret}"},
                              data=json.dumps({
                                  "service_entity_id": service.entity_id
                              }), content_type="application/json")
        self.assertEqual("disconnected", res.json["status"])
        # Reload
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.assertFalse(service in collaboration.services)

    # Org API
    def test_disconnect_collaborations_service_deprecated(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.assertTrue(service in collaboration.services)

        res = self.client.put("/api/collaborations_services/v1/disconnect_collaboration_service",
                              headers={"Authorization": f"Bearer {unifra_secret}"},
                              data=json.dumps({
                                  "short_name": collaboration.short_name,
                                  "service_entity_id": service.entity_id
                              }), content_type="application/json")
        self.assertEqual("disconnected", res.json["status"])
        # Reload
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.assertFalse(service in collaboration.services)

    def test_disconnect_collaboration_service_forbidden(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)

        res = self.client.put("/api/collaborations_services/v1/disconnect_collaboration_service",
                              headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                              data=json.dumps({
                                  "short_name": collaboration.short_name,
                                  "service_entity_id": service_cloud.entity_id
                              }), content_type="application/json")
        self.assertEqual(res.status_code, 403)
        error_dict = res.json
        self.assertTrue("is not part of organisation" in error_dict["message"])

    def test_disconnect_collaboration_service_not_connected(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_mail_name)

        self.assertFalse(service in collaboration.services)

        res = self.client.put("/api/collaborations_services/v1/disconnect_collaboration_service",
                              headers={"Authorization": f"Bearer {unifra_secret}"},
                              data=json.dumps({
                                  "short_name": collaboration.short_name,
                                  "service_entity_id": service.entity_id
                              }), content_type="application/json")
        self.assertEqual(res.status_code, 409)
        error_dict = res.json
        self.assertTrue("is not connected to collaboration" in error_dict["message"])

    def test_add_collaborations_services_override_access_allowed_all_connections(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        service_cloud_id = self.find_entity_by_name(Service, "SRAM Demo SP").id

        res = self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        }, response_status_code=400)
        self.assertTrue(res["error"])
        self.assertTrue("Connection not allowed" in res["message"])
