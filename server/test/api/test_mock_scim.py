from server.api.base import application_base_url
from server.db.domain import User, Collaboration, Service
from server.scim import EXTERNAL_ID_POST_FIX
from server.scim.group_template import create_group_template, scim_member_object, update_group_template
from server.scim.user_template import create_user_template
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, ai_computing_name, service_cloud_name


class TestMockScim(AbstractTest):

    # Very lengthy flow test, but we need the ordering right
    def test_mock_scim_flow(self):
        self.delete("/api/scim_mock/clear")

        cloud_service = self.find_entity_by_name(Service, service_cloud_name)
        headers = {"X-Service": str(cloud_service.id), "Authorization": f"bearer {cloud_service.scim_bearer_token}"}
        sarah = self.find_entity_by_name(User, sarah_name)

        body = create_user_template(sarah)
        # Create a user
        res = self.post("/api/scim_mock/Users",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_user = res["id"]
        self.assertIsNotNone(scim_id_user)

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
        res = self.get("/api/scim_mock/Users",
                       query_data={"filter": f"externalId eq \"{sarah.external_id}{EXTERNAL_ID_POST_FIX}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["Resources"][0]["id"])
        self.assertEqual(sarah.email, res["Resources"][0]["emails"][0]["value"])

        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
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
        collaboration.global_urn = "Changed"
        body = update_group_template(collaboration, [member_object], scim_id_group)
        res = self.put(f"/api/scim_mock/Groups/{scim_id_group}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(collaboration.global_urn, res["displayName"])
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

        self.assertEqual(1, len(res["database"][str(cloud_service.id)]["users"]))
        self.assertEqual(1, len(res["database"][str(cloud_service.id)]["groups"]))
        self.assertEqual(8, len(res["http_calls"][str(cloud_service.id)]))

        self.delete("/api/scim_mock/Users", primary_key=scim_id_user, with_basic_auth=False, headers=headers)
        self.delete("/api/scim_mock/Groups", primary_key=scim_id_group, with_basic_auth=False, headers=headers)

        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)

        self.assertEqual(0, len(res["database"][str(cloud_service.id)]["users"]))
        self.assertEqual(0, len(res["database"][str(cloud_service.id)]["groups"]))
        self.assertEqual(10, len(res["http_calls"][str(cloud_service.id)]))

        # Now reset everything
        self.delete("/api/scim_mock/clear", with_basic_auth=False)
        res = self.get("/api/scim_mock/statistics", with_basic_auth=False)
        self.assertEqual(0, len(res["database"]))

    def test_scim_services(self):
        self.login("urn:john")
        scim_services = self.get("/api/scim_mock/scim-services", with_basic_auth=False)
        self.assertEqual(3, len(scim_services))

    def test_mock_scim_authorization(self):
        cloud_service = self.find_entity_by_name(Service, service_cloud_name)

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service.id)},
                  with_basic_auth=False,
                  response_status_code=401)

        self.post("/api/scim_mock/Users",
                  body={},
                  headers={"X-Service": str(cloud_service.id), "Authorization": "bearer nope"},
                  with_basic_auth=False,
                  response_status_code=401)
