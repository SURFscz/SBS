import json

import responses
from werkzeug.exceptions import BadRequest

from server.api.base import application_base_url
from server.db.domain import Service, Group, User, Collaboration

from server.scim import SCIM_GROUPS
from server.scim.group_template import create_group_template, scim_member_object
from server.scim.repo import all_scim_groups_by_service
from server.scim.schema_template import SCIM_SCHEMA_SRAM_GROUP
from server.scim.sweep import perform_sweep, _all_remote_scim_objects, _group_changed, _user_changed
from server.scim.user_template import create_user_template, find_user_by_id_template

from server.test.scim import TEST_SCIM_SERVER, TEST_SCIM_USERS_ENDPOINT, TEST_SCIM_GROUPS_ENDPOINT
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name, group_ai_researchers, user_john_name, co_ai_computing_name
from server.tools import read_file


class TestSweep(AbstractTest):

    def setUp(self):
        super(TestSweep, self).setUp()
        self.add_bearer_token_to_services()

    @responses.activate
    def test_sweep_no_changes(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, TEST_SCIM_USERS_ENDPOINT, json=remote_users, status=200)
            rsps.add(responses.GET, TEST_SCIM_GROUPS_ENDPOINT, json=remote_groups, status=200)

            sync_results = perform_sweep(service)

            self.assertDictEqual({
                "users": {"deleted": [], "created": [], "updated": []},
                "groups": {"deleted": [], "created": [], "updated": []},
                "scim_url": TEST_SCIM_SERVER
            }, sync_results)

    @responses.activate
    def test_sweep_changes(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_changes.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_changes.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, TEST_SCIM_USERS_ENDPOINT, json=remote_users, status=200)
            rsps.add(responses.GET, TEST_SCIM_GROUPS_ENDPOINT, json=remote_groups, status=200)
            # Perform a diff between remote_groups_changes.json and remote_groups_unchanged.json to explain responses
            rsps.add(responses.DELETE,
                     f"{TEST_SCIM_GROUPS_ENDPOINT}/19D2F1B9-5A1D-43D5-8F0C-FE6474E313E3",
                     status=204)
            rsps.add(responses.DELETE,
                     f"{TEST_SCIM_USERS_ENDPOINT}/1DE53F36-2DB3-4CD4-8204-6692958F1133",
                     status=204)
            user_created = json.loads(read_file("test/scim/user_created.json"))
            rsps.add(responses.PUT,
                     f"{TEST_SCIM_USERS_ENDPOINT}/CC7352C1-D752-4588-9FF3-014800EA094B",
                     json=user_created, status=201)
            rsps.add(responses.POST, TEST_SCIM_USERS_ENDPOINT, json=user_created, status=201)

            group_created = json.loads(read_file("test/scim/group_created.json"))
            rsps.add(responses.PUT, f"{TEST_SCIM_GROUPS_ENDPOINT}/768F27CF-98E2-42B4-9913-3AACF370D8FD",
                     json=group_created, status=201)
            rsps.add(responses.PUT, f"{TEST_SCIM_GROUPS_ENDPOINT}/204DD260-D297-41E2-97AF-CDEF68EFB35B",
                     json=group_created, status=201)
            rsps.add(responses.POST, TEST_SCIM_GROUPS_ENDPOINT, json=group_created, status=201)

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
            rsps.add(responses.GET, TEST_SCIM_USERS_ENDPOINT, json=remote_users, status=200)
            rsps.add(responses.GET, TEST_SCIM_GROUPS_ENDPOINT, json=remote_groups, status=200)
            for group_id in [g["id"] for g in remote_groups["Resources"]]:
                rsps.add(responses.DELETE,
                         f"{TEST_SCIM_GROUPS_ENDPOINT}/{group_id}",
                         status=204)
            for user_id in [u["id"] for u in remote_users["Resources"]]:
                rsps.add(responses.DELETE,
                         f"{TEST_SCIM_USERS_ENDPOINT}/{user_id}",
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
            rsps.add(responses.GET, TEST_SCIM_GROUPS_ENDPOINT, json=remote_groups,
                     status=200)
            scim_objects = _all_remote_scim_objects(service, SCIM_GROUPS)
            self.assertEqual(3, len(scim_objects))

    @responses.activate
    def test_error_scim_results(self):
        def all_remote():
            service = self.find_entity_by_name(Service, service_network_name)
            with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
                rsps.add(responses.GET, TEST_SCIM_GROUPS_ENDPOINT, json={"error": True},
                         status=400)
                _all_remote_scim_objects(service, SCIM_GROUPS)
            self.assertRaises(BadRequest, all_remote)

    @staticmethod
    def _construct_group_changed_parameters(group):
        base_url = application_base_url()
        membership_scim_objects = [scim_member_object(base_url, m) for m in group.collaboration_memberships]
        remote_group = create_group_template(group, membership_scim_objects)
        remote_scim_users = [find_user_by_id_template(m.user) for m in group.collaboration_memberships]
        return remote_group, remote_scim_users

    def test_group_changed_urn(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)
        group.global_urn = "changed"
        self.assertTrue(_group_changed(group, remote_group, remote_scim_users))

    def test_group_changed_name(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)
        group.name = "changed"
        self.assertTrue(_group_changed(group, remote_group, remote_scim_users))

    def test_group_changed_description(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)
        group.description = "changed"
        self.assertTrue(_group_changed(group, remote_group, remote_scim_users))

    def test_group_changed_members(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)
        group.collaboration_memberships = []
        self.assertTrue(_group_changed(group, remote_group, remote_scim_users))

    def test_group_changed_tags(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(collaboration)
        collaboration.tags = []
        self.assertTrue(_group_changed(collaboration, remote_group, remote_scim_users))

    def test_group_changed_links(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(collaboration)

        # existing links have changed
        collaboration.identifier = 'changed'
        self.assertTrue(_group_changed(collaboration, remote_group, remote_scim_users))

        # remote has other links
        remote_group[SCIM_SCHEMA_SRAM_GROUP]['links'] = [{'name': 'Het Paard van Sinterklaas', 'value': 'Ohzosnel'}]
        self.assertTrue(_group_changed(collaboration, remote_group, remote_scim_users))

    def test_group_changed_links_logo(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(collaboration)

        # remote has different logo
        for link in remote_group[SCIM_SCHEMA_SRAM_GROUP]['links']:
            if link['name'] == 'logo':
                link['value'] = 'https://expample.com/sinterklaas.jpg'
        self.assertTrue(_group_changed(collaboration, remote_group, remote_scim_users))

    def test_group_changed_links_group(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)

        remote_group[SCIM_SCHEMA_SRAM_GROUP]['links'] = [{'name': 'changed', 'value': 'changed'}]
        self.assertTrue(_group_changed(group, remote_group, remote_scim_users))

    def test_group_not_changed(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        remote_group, remote_scim_users = self._construct_group_changed_parameters(collaboration)
        self.assertFalse(_group_changed(collaboration, remote_group, remote_scim_users))

    def test_group_changed_description_empty(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        group.description = ""
        remote_group, remote_scim_users = self._construct_group_changed_parameters(group)
        self.assertFalse(_group_changed(group, remote_group, remote_scim_users))

    def test_user_changed(self):
        user = self.find_entity_by_name(User, user_john_name)
        remote_user = create_user_template(user)
        self.assertFalse(_user_changed(user, remote_user))
        for attr in ["username", "given_name", "family_name", "name", "email", "affiliation", "uid",
                     "scoped_affiliation", "eduperson_principal_name"]:
            stored_attr = getattr(user, attr)
            setattr(user, attr, "changed")
            self.assertTrue(_user_changed(user, remote_user))
            setattr(user, attr, stored_attr)
        user.suspended = True
        self.assertTrue(_user_changed(user, remote_user))
        user.suspended = False
        user.ssh_keys = []
        self.assertTrue(_user_changed(user, remote_user))
