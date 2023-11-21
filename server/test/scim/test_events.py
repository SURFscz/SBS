import json
import os

import responses

from server.db.domain import User, Collaboration, Group, Organisation, Service
from server.scim.events import broadcast_user_changed, broadcast_user_deleted, broadcast_collaboration_changed, \
    broadcast_collaboration_deleted, \
    broadcast_organisation_deleted, broadcast_group_changed, broadcast_service_added, \
    broadcast_service_deleted, broadcast_group_deleted, broadcast_organisation_service_added, \
    broadcast_organisation_service_deleted
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, co_research_name, group_ai_researchers, unifra_name, service_cloud_name
from server.tools import read_file


class TestEvents(AbstractTest):

    @classmethod
    def setUpClass(cls):
        super(TestEvents, cls).setUpClass()
        del os.environ["SCIM_DISABLED"]

    @classmethod
    def tearDownClass(cls):
        super(TestEvents, cls).tearDownClass()
        os.environ["SCIM_DISABLED"] = "1"

    @responses.activate
    def test_apply_user_change_create(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        user_created = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", json=user_created, status=201)
            future = broadcast_user_changed(sarah.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_user_change_create_provisioning_error(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", status=400)
            future = broadcast_user_changed(sarah.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_user_change_create_with_invalid_response(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_created = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json={}, status=400)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", json=user_created, status=201)
            future = broadcast_user_changed(sarah.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_user_change_update(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_found = json.loads(read_file("test/scim/user_found.json"))
        user_updated = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.PUT,
                     "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=user_updated, status=201)
            future = broadcast_user_changed(sarah.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_user_change_delete(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_found = json.loads(read_file("test/scim/user_found.json"))
        group_found = json.loads(read_file("test/scim/group_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.PUT, "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=group_created, status=201)
            collaboration_identifiers = [member.collaboration_id for member in sarah.collaboration_memberships]
            future = broadcast_user_deleted(sarah.external_id, collaboration_identifiers)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_group_change_create_new_users(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        user_created = json.loads(read_file("test/scim/user_created.json"))
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=no_group_found, status=200)
            # We mock that all members are not known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", json=user_created, status=201)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Groups", json=group_created, status=201)
            future = broadcast_collaboration_changed(collaboration.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_group_change_update_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.PUT, "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=group_created, status=201)
            future = broadcast_collaboration_changed(collaboration.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_group_change_delete_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.DELETE, "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            res = broadcast_collaboration_deleted(collaboration.id)
            self.assertTrue(res)

    @responses.activate
    def test_apply_group_change_create_no_users(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        group = self.find_entity_by_name(Group, group_ai_researchers)
        self.clear_group_memberships(group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=no_group_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Groups", json=group_created, status=201)
            future = broadcast_group_changed(group.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_group_change_create_error_response(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        group = self.find_entity_by_name(Group, group_ai_researchers)
        self.clear_group_memberships(group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=no_group_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Groups", json=group_created, status=400)
            future = broadcast_group_changed(group.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_delete_group(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        group = self.find_entity_by_name(Group, group_ai_researchers)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            res = broadcast_group_deleted(group.id)
            self.assertTrue(res)

    @responses.activate
    def test_organisation_service_update_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        service = self.find_entity_by_name(Service, service_cloud_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.PUT, "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=group_created, status=201)
            future = broadcast_organisation_service_added(organisation.id, service.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_organisation_deleted_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.DELETE, "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            res = broadcast_organisation_deleted(organisation.id)
            self.assertTrue(res)

    @responses.activate
    def test_broadcast_organisation_service_deleted(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        service = self.find_entity_by_name(Service, service_cloud_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.DELETE, "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            future = broadcast_organisation_service_deleted(organisation.id, service.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_service_added(self):
        user_created = json.loads(read_file("test/scim/user_created.json"))
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))

        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Users", json=user_created, status=201)

            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=no_group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.POST, "http://localhost:8080/api/scim_mock/Groups", json=group_created, status=201)
            future = broadcast_service_added(collaboration.id, service.id)
            res = future.result()
            self.assertTrue(res)

    @responses.activate
    def test_apply_service_removed(self):
        user_found = json.loads(read_file("test/scim/user_found.json"))
        group_found = json.loads(read_file("test/scim/group_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        service = self.find_entity_by_name(Service, service_cloud_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=group_found, status=200)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=user_found, status=200)
            rsps.add(responses.DELETE,
                     "http://localhost:8080/api/scim_mock/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            res = broadcast_service_deleted(collaboration.id, service.id)
            self.assertTrue(res)
