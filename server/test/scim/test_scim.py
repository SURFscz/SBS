# -*- coding: future_fstrings -*-
import json

import responses

from server.db.domain import User, Collaboration, Group
from server.scim.scim import apply_user_change, apply_group_change
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, uva_research_name, ai_researchers_group
from server.tools import read_file


class TestScim(AbstractTest):

    @responses.activate
    def test_apply_user_change_create(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        user_created = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:9002/Users", json=user_created, status=201)
            apply_user_change(sarah)

    @responses.activate
    def test_apply_user_change_create_with_invalid_response(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_created = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users", json={}, status=400)
            rsps.add(responses.POST, "http://localhost:9002/Users", json=user_created, status=201)
            apply_user_change(sarah)

    @responses.activate
    def test_apply_user_change_update(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_found = json.loads(read_file("test/scim/user_found.json"))
        user_updated = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            rsps.add(responses.PUT, "http://localhost:9002/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1?counter=1",
                     json=user_updated, status=201)
            apply_user_change(sarah)

    @responses.activate
    def test_apply_user_change_delete(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_found = json.loads(read_file("test/scim/user_found.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            rsps.add(responses.DELETE, "http://localhost:9002/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1?counter=1",
                     status=201)
            apply_user_change(sarah, deletion=True)

    @responses.activate
    def test_apply_group_change_create_new_users(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        user_created = json.loads(read_file("test/scim/user_created.json"))
        collaboration = self.find_entity_by_name(Collaboration, uva_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Groups", json=no_group_found, status=200)
            # We mock that all members are not known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:9002/Users", json=user_created, status=201)
            rsps.add(responses.POST, "http://localhost:9002/Groups", json=group_created, status=201)
            apply_group_change(collaboration)

    @responses.activate
    def test_apply_group_change_update_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, uva_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            rsps.add(responses.PUT, "http://localhost:9002/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=group_created, status=201)
            apply_group_change(collaboration)

    @responses.activate
    def test_apply_group_change_delete_existing_users(self):
        group_found = json.loads(read_file("test/scim/group_found.json"))
        user_found = json.loads(read_file("test/scim/user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, uva_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Groups", json=group_found, status=200)
            # We mock that all members are already known in the remote SCIM DB
            rsps.add(responses.GET, "http://localhost:9002/Users", json=user_found, status=200)
            rsps.add(responses.DELETE, "http://localhost:9002/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            rsps.add(responses.DELETE, "http://localhost:9002/Groups/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     status=201)
            apply_group_change(collaboration, deletion=True)

    @responses.activate
    def test_apply_group_change_create_no_users(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        group = self.find_entity_by_name(Group, ai_researchers_group)
        self.clear_group_memberships(group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Groups", json=no_group_found, status=200)
            rsps.add(responses.POST, "http://localhost:9002/Groups", json=group_created, status=201)
            apply_group_change(group)

    @responses.activate
    def test_apply_group_change_create_error_response(self):
        no_group_found = json.loads(read_file("test/scim/no_user_found.json"))
        group_created = json.loads(read_file("test/scim/group_created.json"))
        group = self.find_entity_by_name(Group, ai_researchers_group)
        self.clear_group_memberships(group)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Groups", json=no_group_found, status=200)
            rsps.add(responses.POST, "http://localhost:9002/Groups", json=group_created, status=400)
            apply_group_change(group)
