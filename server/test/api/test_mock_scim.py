from server.db.domain import User, Collaboration, Service
from server.scim.group_template import create_group_template
from server.scim.user_template import create_user_template, external_id_post_fix
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, ai_computing_name, service_cloud_name


class TestMockScim(AbstractTest):

    # Very lengthy flow test, but we need the ordering right
    def test_mock_scim_flow(self):
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
                       query_data={"filter": f"externalId eq \"{sarah.external_id}{external_id_post_fix}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_user, res["Resources"][0]["id"])
        self.assertEqual(sarah.email, res["Resources"][0]["emails"][0]["value"])

        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        body = create_group_template(collaboration, [scim_id_user])
        # Create Group with one member
        res = self.post("/api/scim_mock/Groups",
                        body=body,
                        headers=headers,
                        with_basic_auth=False)
        scim_id_group = res["id"]
        self.assertIsNotNone(scim_id_group)

        # Update the group
        collaboration.name = "Changed"
        body = create_group_template(collaboration, [scim_id_user])
        res = self.put(f"/api/scim_mock/Groups/{scim_id_group}",
                       body=body,
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(collaboration.name, res["displayName"])

        # Find the group by externalId
        res = self.get("/api/scim_mock/Groups",
                       query_data={"filter": f"externalId eq \"{collaboration.identifier}{external_id_post_fix}\""},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(scim_id_group, res["Resources"][0]["id"])

        # Need to be super admin
        self.login("urn:john")
        res = self.get("/api/scim_mock/services", with_basic_auth=False)

        self.assertEqual(1, len(res["database"][str(cloud_service.id)]["users"]))
        self.assertEqual(1, len(res["database"][str(cloud_service.id)]["groups"]))
        self.assertEqual(7, len(res["http_calls"][str(cloud_service.id)]))

        # Now reset everything
        self.delete("/api/scim_mock/clear", with_basic_auth=False)
        res = self.get("/api/scim_mock/services", with_basic_auth=False)
        self.assertEqual(0, len(res["database"]))

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
