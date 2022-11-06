import json

import responses

from server.db.domain import User, Collaboration, Group
from server.scim.user_template import external_id_post_fix
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
                       headers={"Authorization": f"bearer {service_network_token}"})
        self.assertEqual(1, len(res["Resources"]))

    @responses.activate
    def test_groups(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            res = self.get("/api/scim/Groups", headers={"Authorization": f"bearer {service_network_token}"})
            self.assertEqual(3, len(res["Resources"]))

    @responses.activate
    def test_collaboration_by_identifier(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            res = self.get(f"/api/scim/Groups/{collaboration.identifier}{external_id_post_fix}",
                           headers={"Authorization": f"bearer {service_network_token}"})
            self.assertEqual(1, len(res["Resources"]))

    @responses.activate
    def test_group_by_identifier(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        group = self.find_entity_by_name(Group, ai_researchers_group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            res = self.get(f"/api/scim/Groups/{group.identifier}{external_id_post_fix}",
                           headers={"Authorization": f"bearer {service_network_token}"})
            self.assertEqual(1, len(res["Resources"]))
