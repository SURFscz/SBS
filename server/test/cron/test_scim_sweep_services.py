import json

import responses

from server.cron.scim_sweep_services import scim_sweep_services
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name
from server.tools import read_file


class TestScimSweepServices(AbstractTest):

    @responses.activate
    def test_schedule_sweep(self):
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            sweep_result = scim_sweep_services(self.app)
            self.assertEqual(1, len(sweep_result))
            self.assertEqual(service_network_name, sweep_result[0]["name"])
            sync_results = sweep_result[0]["sync_results"]
            self.assertEqual(0, len(sync_results["groups"]["created"]))
            self.assertEqual(0, len(sync_results["users"]["created"]))
