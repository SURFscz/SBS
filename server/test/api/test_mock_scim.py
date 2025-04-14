from server.api.base import application_base_url
from server.api.mock_scim import HTTP_CALLS_KEY, DATABASE_KEY
from server.db.domain import User, Collaboration, Service
from server.scim import EXTERNAL_ID_POST_FIX
from server.scim.schema_template import get_scim_schema_sram_group
from server.scim.group_template import create_group_template, scim_member_object, update_group_template
from server.scim.user_template import create_user_template
from server.test.abstract_test import AbstractTest
from server.test.seed import user_sarah_name, co_ai_computing_name, service_cloud_name
from flask import current_app


class TestMockScim(AbstractTest):

    # Very lengthy flow test, but we need the ordering right
    def test_mock_scim_flow(self):
        self.delete("/api/scim_mock/clear")

        current_app.redis_client.set(HTTP_CALLS_KEY, "")
        current_app.redis_client.set(DATABASE_KEY, "")

        cloud_service_id = self.find_entity_by_name(Service, service_cloud_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{cloud_service_id}",
                 {"scim_bearer_token": "secret"})

        headers = {"X-Service": str(cloud_service_id), "Authorization": "bearer secret"}
        sarah = self.find_entity_by_name(User, user_sarah_name)

        body = create_user_template(sarah)
        # Create a user
        res = self.post("/api/scim_mock/Users",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_user = res["id"]
        self.assertIsNotNone(scim_id_user)

        sarah = self.find_entity_by_name(User, user_sarah_name)
        sarah.email = "changed@example.com"
        body = create_user_template(sarah)
        # Update a user
        res = self.put(f"/api/scim_mock/Users/{scim_id_user}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["id"])

        # Update a non-existent user, bad request
        self.put("/api/scim_mock/Users/nope",
                 body=body,
                 headers=headers,
                 with_basic_auth=False,
                 response_status_code=400)

        # Find by externalId
        sarah = self.find_entity_by_name(User, user_sarah_name)
        res = self.get("/api/scim_mock/Users",
                       query_data={"filter": f"externalId eq \"{sarah.external_id}{EXTERNAL_ID_POST_FIX}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["Resources"][0]["id"])
        sarah = self.find_entity_by_name(User, user_sarah_name)
        self.assertEqual(sarah.email, res["Resources"][0]["emails"][0]["value"])

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration_membership = collaboration.collaboration_memberships[0]
        member_object = scim_member_object(application_base_url(), collaboration_membership,
                                           scim_object={"id": scim_id_user})
        body = create_group_template(collaboration, [member_object])
        # Create Group with one member
        res = self.post("/api/scim_mock/Groups",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_group = res["id"]
        self.assertIsNotNone(scim_id_group)

        # Update the group
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.global_urn = "Changed"
        body = update_group_template(collaboration, [member_object], scim_id_group)
        res = self.put(f"/api/scim_mock/Groups/{scim_id_group}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(collaboration.global_urn, res[get_scim_schema_sram_group()]["urn"])
        self.assertEqual(scim_id_user, res["members"][0]["value"])

        # Find the group by externalId
        res = self.get("/api/scim_mock/Groups",
                       query_data={"filter": f"externalId eq \"{collaboration.identifier}{EXTERNAL_ID_POST_FIX}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_group, res["Resources"][0]["id"])
        # Find all groups
        res = self.get("/api/scim_mock/Groups",
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_group, res["Resources"][0]["id"])

        # Need to be super admin
        self.login("urn:john")

        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)
        print("debugging wonkey test")
        print(cloud_service_id)
        print(res)
        self.assertEqual(1, len(res["database"][str(cloud_service_id)]["users"]))
        self.assertEqual(1, len(res["database"][str(cloud_service_id)]["groups"]))
        self.assertEqual(8, len(res["http_calls"][str(cloud_service_id)]))

        self.delete("/api/scim_mock/Users", primary_key=scim_id_user, with_basic_auth=False, headers=headers)
        self.delete("/api/scim_mock/Groups", primary_key=scim_id_group, with_basic_auth=False, headers=headers)

        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)

        self.assertEqual(0, len(res["database"][str(cloud_service_id)]["users"]))
        self.assertEqual(0, len(res["database"][str(cloud_service_id)]["groups"]))
        self.assertEqual(10, len(res["http_calls"][str(cloud_service_id)]))

        # Now reset everything
        self.delete("/api/scim_mock/clear", with_basic_auth=False)
        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)
        self.assertEqual(0, len(res["database"]))

    def test_mock_scim_authorization(self):
        cloud_service_id = self.find_entity_by_name(Service, service_cloud_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{cloud_service_id}",
                 {"scim_bearer_token": "secret"})

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service_id)},
                  with_basic_auth=False,
                  response_status_code=401)

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service_id), "Authorization": "bearer nope"},
                  with_basic_auth=False,
                  response_status_code=401)
