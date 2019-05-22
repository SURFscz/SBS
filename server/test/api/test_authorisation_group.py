# -*- coding: future_fstrings -*-
from server.db.db import Collaboration, AuthorisationGroup, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, ai_computing_name, service_cloud_name, \
    service_wireless_name, ai_researchers_authorisation_short_name


class TestAuthorisationGroup(AbstractTest):

    def test_my_authorisation_groups(self):
        self.login("urn:john")
        authorisation_groups = self.get("api/authorisation_groups", with_basic_auth=False)
        self.assertEqual(2, len(authorisation_groups))

    def test_authorisation_group_name_exists(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/authorisation_groups/name_exists",
                       query_data={"name": ai_researchers_authorisation, "collaboration_id": collaboration_id})
        self.assertEqual(True, res)

        res = self.get("/api/authorisation_groups/name_exists",
                       query_data={"name": "uuc", "existing_authorisation_group": ai_researchers_authorisation,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/authorisation_groups/name_exists",
                       query_data={"name": "xyc", "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/authorisation_groups/name_exists",
                       query_data={"name": "xyc", "existing_authorisation_group": "xyc",
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

    def test_authorisation_group_short_name_exists(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/authorisation_groups/short_name_exists",
                       query_data={"short_name": ai_researchers_authorisation_short_name,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(True, res)

        res = self.get("/api/authorisation_groups/short_name_exists",
                       query_data={"short_name": "uuc",
                                   "existing_authorisation_group": ai_researchers_authorisation_short_name,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/authorisation_groups/short_name_exists",
                       query_data={"short_name": "xyc", "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/authorisation_groups/short_name_exists",
                       query_data={"short_name": "xyc", "existing_authorisation_group": "xyc",
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

    def test_authorisation_group_by_id(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        authorisation_group_id = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation).id
        authorisation_group = self.get(f"/api/authorisation_groups/{authorisation_group_id}/{collaboration_id}")
        self.assertTrue(len(authorisation_group["collaboration_memberships"]) > 0)
        self.assertTrue(len(authorisation_group["services"]) > 0)

    def test_save_authorisation_group(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id
        service_wireless_id = self.find_entity_by_name(Service, service_wireless_name).id

        # We need to link the services first to the collaboration otherwise the database complains
        self.put("/api/collaborations_services",
                 body={"collaboration_id": collaboration_id, "service_ids": [service_cloud_id, service_wireless_id]})

        authorisation_group_name = "new_auth_group"
        authorisation_group = self.post("/api/authorisation_groups/", body={
            "name": authorisation_group_name,
            "short_name": authorisation_group_name,
            "uri": "https://uri",
            "description": "des",
            "status": "open",
            "service_ids": [service_cloud_id, service_wireless_id],
            "collaboration_id": collaboration_id,
        })
        authorisation_group = self.get(f"/api/authorisation_groups/{authorisation_group['id']}/{collaboration_id}")
        self.assertEqual(2, len(authorisation_group["services"]))

    def test_update_authorisation_group(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        authorisation_group_id = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation).id
        authorisation_group = self.get(f"/api/authorisation_groups/{authorisation_group_id}/{collaboration_id}")

        authorisation_group["status"] = "inactive"
        self.put("/api/authorisation_groups/", body=authorisation_group)

        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        self.assertEqual("inactive", authorisation_group.status)

    def test_delete_authorisation_group(self):
        authorisation_group_id = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation).id
        self.delete(f"/api/authorisation_groups", primary_key=authorisation_group_id)
        self.delete(f"/api/authorisation_groups", primary_key=authorisation_group_id, response_status_code=404)
