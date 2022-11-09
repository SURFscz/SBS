import json

import responses

from server.db.domain import User, Collaboration, Group
from server.scim.user_template import external_id_post_fix, version_value
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_token, jane_name, ai_computing_name, ai_researchers_group
from server.tools import read_file


class TestScim(AbstractTest):

    def test_users(self):
        res = self.get("/api/scim/Users", headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(5, len(res["Resources"]))

    def test_user_by_external_id(self):
        jane = self.find_entity_by_name(User, jane_name)
        res = self.get(f"/api/scim/Users/{jane.external_id}{external_id_post_fix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       expected_headers={"Etag": version_value(jane)})
        self.assertEqual(f"{jane.external_id}{external_id_post_fix}", res["externalId"])
        self.assertEqual("User", res["meta"]["resourceType"])

    def test_user_by_external_id_404(self):
        self.get("/api/scim/Users/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 response_status_code=404)

    @responses.activate
    def test_groups(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            res = self.get("/api/scim/Groups", headers={"Authorization": f"bearer {service_network_token}"})
            self.assertEqual(3, len(res["Resources"]))

    @responses.activate
    def test_collaboration_by_identifier(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            res = self.get(f"/api/scim/Groups/{collaboration.identifier}{external_id_post_fix}",
                           headers={"Authorization": f"bearer {service_network_token}"},
                           expected_headers={"Etag": version_value(collaboration)})
            self.assertEqual(f"{collaboration.identifier}{external_id_post_fix}", res["externalId"])

    @responses.activate
    def test_group_by_identifier(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        group = self.find_entity_by_name(Group, ai_researchers_group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            res = self.get(f"/api/scim/Groups/{group.identifier}{external_id_post_fix}",
                           headers={"Authorization": f"bearer {service_network_token}"})
            self.assertEqual(f"{group.identifier}{external_id_post_fix}", res["externalId"])
            self.assertEqual("Group", res["meta"]["resourceType"])

    def test_collaboration_by_identifier_404(self):
        self.get("/api/scim/Groups/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 response_status_code=404)
