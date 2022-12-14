import json

import responses

from server.db.domain import Service
from server.scim.sweep import perform_sweep
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name
from server.tools import read_file


class TestSweep(AbstractTest):

    @responses.activate
    def test_sweep(self):
        service = self.find_entity_by_name(Service, service_network_name)
        remote_groups = json.loads(read_file("test/scim/remote_groups.json"))
        remote_users = json.loads(read_file("test/scim/remote_users.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            perform_sweep(service)
