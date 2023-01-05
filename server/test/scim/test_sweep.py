import json

import responses

from server.db.domain import Service, Group, User
from server.scim import SCIM_GROUPS
from server.scim.group_template import create_group_template
from server.scim.repo import all_scim_groups_by_service
from server.scim.sweep import perform_sweep, _all_remote_scim_objects, _group_changed, _user_changed
from server.scim.user_template import create_user_template
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name, ai_researchers_group, john_name
from server.tools import read_file


class TestSweep(AbstractTest):

    @responses.activate
    def test_sweep_no_changes(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)

            sync_results = perform_sweep(service)

            self.assertDictEqual({
                "users": {"deleted": [], "created": [], "updated": []},
                "groups": {"deleted": [], "created": [], "updated": []}
            }, sync_results)

    @responses.activate
    def test_sweep_changes(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_changes.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_changes.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            # Perform a diff between remote_groups_changes.json and remote_groups_unchanged.json to explain responses
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/19D2F1B9-5A1D-43D5-8F0C-FE6474E313E3",
                     status=204)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Users/1DE53F36-2DB3-4CD4-8204-6692958F1133",
                     status=204)
            user_created = json.loads(read_file("test/scim/user_created.json"))
            rsps.add(responses.PUT,
                     "http://localhost:8080/api/scim_mock/Users/CC7352C1-D752-4588-9FF3-014800EA094B",
                     json=user_created, status=201)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", json=user_created, status=201)

            group_created = json.loads(read_file("test/scim/group_created.json"))
            rsps.add(responses.PUT, "http://localhost:8080/api/scim_mock/Groups/768F27CF-98E2-42B4-9913-3AACF370D8FD",
                     json=group_created, status=201)
            rsps.add(responses.PUT, "http://localhost:8080/api/scim_mock/Groups/204DD260-D297-41E2-97AF-CDEF68EFB35B",
                     json=group_created, status=201)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Groups", json=group_created, status=201)

            sync_results = perform_sweep(service)
            self.assertEqual(1, len(sync_results["users"]["deleted"]))
            self.assertEqual(1, len(sync_results["users"]["created"]))
            self.assertEqual(1, len(sync_results["users"]["updated"]))
            self.assertEqual(1, len(sync_results["groups"]["deleted"]))
            self.assertEqual(1, len(sync_results["groups"]["created"]))
            self.assertEqual(2, len(sync_results["groups"]["updated"]))

    @responses.activate
    def test_sweep_orphaned_users_groups(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))

        all_groups = all_scim_groups_by_service(service)
        for group in all_groups:
            group.collaboration_memberships.clear()
            self.save_entity(group)

        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            for group_id in [g["id"] for g in remote_groups["Resources"]]:
                rsps.add(responses.DELETE,
                         f"http://localhost:8080/api/scim_mock/Groups/{group_id}",
                         status=204)
            for user_id in [u["id"] for u in remote_users["Resources"]]:
                rsps.add(responses.DELETE,
                         f"http://localhost:8080/api/scim_mock/Users/{user_id}",
                         status=204)

            sync_results = perform_sweep(service)
            self.assertEqual(5, len(sync_results["users"]["deleted"]))
            self.assertEqual(0, len(sync_results["users"]["created"]))
            self.assertEqual(0, len(sync_results["users"]["updated"]))
            self.assertEqual(3, len(sync_results["groups"]["deleted"]))
            self.assertEqual(0, len(sync_results["groups"]["created"]))
            self.assertEqual(0, len(sync_results["groups"]["updated"]))

    @responses.activate
    def test_paginated_scim_results(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = {"totalResults": 3,
                         "Resources": [1]}
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups,
                     status=200)
            scim_objects = _all_remote_scim_objects(service, SCIM_GROUPS)
            self.assertEqual(3, len(scim_objects))

    @responses.activate
    def test_error_scim_results(self):
        service = self.find_entity_by_name(Service, service_network_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json={"error": True},
                     status=400)
            scim_objects = _all_remote_scim_objects(service, SCIM_GROUPS)
            self.assertEqual(0, len(scim_objects))

    def test_group_changed(self):
        group = self.find_entity_by_name(Group, ai_researchers_group)
        remote_group = create_group_template(group, [{"id": "scim_id", "value": "value"}])
        group.global_urn = "changed"
        self.assertTrue(_group_changed(group, remote_group, []))

    def test_user_changed(self):
        user = self.find_entity_by_name(User, john_name)
        remote_user = create_user_template(user)
        self.assertFalse(_user_changed(user, remote_user))
        for attr in ["username", "given_name", "family_name", "name", "email"]:
            stored_attr = getattr(user, attr)
            setattr(user, attr, "changed")
            self.assertTrue(_user_changed(user, remote_user))
            setattr(user, attr, stored_attr)
        user.suspended = True
        self.assertTrue(_user_changed(user, remote_user))
        user.suspended = False
        user.ssh_keys = []
        self.assertTrue(_user_changed(user, remote_user))