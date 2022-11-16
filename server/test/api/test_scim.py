from server.db.domain import User, Collaboration, Group
from server.scim.schema_template import schemas
from server.scim.user_template import external_id_post_fix, version_value
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_token, jane_name, ai_computing_name, ai_researchers_group


class TestScim(AbstractTest):

    def test_users(self):
        res = self.get("/api/scim/v2/Users", headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(5, len(res["Resources"]))

    def test_user_by_external_id(self):
        jane = self.find_entity_by_name(User, jane_name)
        res = self.get(f"/api/scim/v2/Users/{jane.external_id}{external_id_post_fix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       expected_headers={"Etag": version_value(jane)})
        self.assertEqual(f"{jane.external_id}{external_id_post_fix}", res["externalId"])
        self.assertEqual("User", res["meta"]["resourceType"])

    def test_user_by_external_id_404(self):
        self.get("/api/scim/v2/Users/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 response_status_code=404)

    def test_groups(self):
        res = self.get("/api/scim/v2/Groups", headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(3, len(res["Resources"]))

    def test_collaboration_by_identifier(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        res = self.get(f"/api/scim/v2/Groups/{collaboration.identifier}{external_id_post_fix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       expected_headers={"Etag": version_value(collaboration)})
        self.assertEqual(f"{collaboration.identifier}{external_id_post_fix}", res["externalId"])
        self.assertEqual(f"{collaboration.identifier}{external_id_post_fix}", res["id"])

    def test_group_by_identifier(self):
        group = self.find_entity_by_name(Group, ai_researchers_group)
        # We mock that all members are already known in the remote SCIM DB
        res = self.get(f"/api/scim/v2/Groups/{group.identifier}{external_id_post_fix}",
                       headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(f"{group.identifier}{external_id_post_fix}", res["externalId"])
        self.assertEqual(f"{group.identifier}{external_id_post_fix}", res["id"])
        self.assertEqual("Group", res["meta"]["resourceType"])

    def test_collaboration_by_identifier_404(self):
        self.get("/api/scim/v2/Groups/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 response_status_code=404)

    def test_schemas(self):
        res = self.get("/api/scim/v2/Schemas")
        self.assertEqual(2, len(res["Resources"]))
        self.assertEqual(res, schemas())
        for resource in res["Resources"]:
            self.get(f"{resource['meta']['location']}", response_status_code=200)
