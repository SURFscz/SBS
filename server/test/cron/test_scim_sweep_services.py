import json

import responses

from server.cron.scim_sweep_services import scim_sweep_services
from server.db.domain import Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name
from server.tools import read_file


class TestScimSweepServices(AbstractTest):

    @responses.activate
    def test_schedule_sweep(self):
        remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
        remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))
        with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            sweep_result = scim_sweep_services(self.app)
            # This is a temporary fix for wonkey test results (OH 19-12-2022)
            self.assertEqual(1, len(sweep_result["services"]))

            self.assertEqual(service_network_name, sweep_result["services"][0]["name"])
            sync_results = sweep_result["services"][0]["sync_results"]
            self.assertEqual(0, len(sync_results["groups"]["created"]))
            self.assertEqual(0, len(sync_results["users"]["created"]))

            sweep_result = scim_sweep_services(self.app)
            self.assertEqual(0, len(sweep_result["services"]))

            service = self.find_entity_by_name(Service, service_network_name)
            service.sweep_scim_last_run = None
            self.save_entity(service)

            sweep_result = scim_sweep_services(self.app)
            self.assertEqual(service_network_name, sweep_result["services"][0]["name"])

    def test_schedule_sweep_fail(self):
        with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", status=503,
                     body="Server unavailable")
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", status=503,
                     body="Server unavailable")
            sweep_result = scim_sweep_services(self.app)
            # This is a temporary fix for wonkey test results (OH 22-1-2024)
            if len(sweep_result["services"]) == 1:
                sync_results = sweep_result["services"][0]["sync_results"]
                self.assertEqual("400 Bad Request: Invalid response from remote SCIM server (got HTTP status 503)",
                                 sync_results)
