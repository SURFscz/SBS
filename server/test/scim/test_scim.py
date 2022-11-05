# -*- coding: future_fstrings -*-
import json

import responses

from server.db.domain import User
from server.scim.scim import apply_user_change
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name
from server.tools import read_file


class TestScim(AbstractTest):

    @responses.activate
    def test_apply_user_change_create(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        user_created = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users",
                     json=no_user_found, status=200)
            rsps.add(responses.POST, "http://localhost:9002/Users",
                     json=user_created, status=201)
            apply_user_change(sarah)

    @responses.activate
    def test_apply_user_change_update(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        user_found = json.loads(read_file("test/scim/user_found.json"))
        user_updated = json.loads(read_file("test/scim/user_created.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:9002/Users",
                     json=user_found, status=200)
            rsps.add(responses.PUT, "http://localhost:9002/Users/8d85ea05-fc5c-4222-8efd-130ff7938ee1",
                     json=user_updated, status=201)
            apply_user_change(sarah)
