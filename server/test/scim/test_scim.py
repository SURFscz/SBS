import json

import responses

from server.db.domain import Collaboration, Service
from server.test.scim import TEST_SCIM_USERS_ENDPOINT
from server.scim.scim import membership_user_scim_objects
from server.test.abstract_test import AbstractTest
from server.test.seed import co_research_name, service_cloud_name
from server.tools import read_file


class TestScim(AbstractTest):

    @responses.activate
    def test_membership_user_scim_identifiers_provisioning_error(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.put(f"/api/services/reset_scim_bearer_token/{service.id}",
                 {"scim_bearer_token": "secret"})

        no_user_found = json.loads(read_file("test/scim/no_user_found.json"))
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, TEST_SCIM_USERS_ENDPOINT, json=no_user_found, status=200)
            # We mock that all member provisioning give an error response
            rsps.add(responses.POST, TEST_SCIM_USERS_ENDPOINT, status=400)
            # Need to reload to prevent DetachedInstanceError
            service = self.find_entity_by_name(Service, service_cloud_name)
            identifiers = membership_user_scim_objects(service, collaboration)
            self.assertListEqual([], identifiers)
