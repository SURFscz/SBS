import urllib.parse

import mock
import requests
import responses
from sqlalchemy import func, text

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Service
from server.scim.repo import all_scim_groups_by_service, all_scim_users_by_service
from server.scim.resource_type_template import resource_type_template
from server.scim.user_template import version_value
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_token, user_jane_name, co_ai_computing_name, group_ai_researchers, \
    service_network_name, service_wiki_token, service_wiki_name
from server.scim.schema_template import schemas_template, get_scim_schema_sram_user


class TestScim(AbstractTest):

    def test_users(self):
        service = self.find_entity_by_name(Service, service_network_name)
        expected_users = len(all_scim_users_by_service(service))
        res = self.get("/api/scim/v2/Users", headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(expected_users, len(res["Resources"]))
        self.assertEqual(expected_users, res["totalResults"])
        self.assertEqual(1, res["startIndex"])
        self.assertEqual(expected_users, res["itemsPerPage"])

    def test_users_pagination(self):
        service = self.find_entity_by_name(Service, service_network_name)
        expected_users = len(all_scim_users_by_service(service))
        self.assertGreaterEqual(expected_users, 3)
        start_index = 2
        count = 2
        headers = {"Authorization": f"bearer {service_network_token}"}
        res = self.get("/api/scim/v2/Users",
                       query_data={"startIndex": start_index, "count": count},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(expected_users, res["totalResults"])
        self.assertEqual(start_index, res["startIndex"])
        self.assertEqual(count, res["itemsPerPage"])
        self.assertEqual(count, len(res["Resources"]))

        beyond_total = expected_users + 1
        res = self.get("/api/scim/v2/Users",
                       query_data={"startIndex": beyond_total},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(expected_users, res["totalResults"])
        self.assertEqual(beyond_total, res["startIndex"])
        self.assertEqual(0, res["itemsPerPage"])
        self.assertEqual(0, len(res["Resources"]))

    def test_users_pagination_invalid_params(self):
        headers = {"Authorization": f"bearer {service_network_token}"}
        self.get("/api/scim/v2/Users",
                 query_data={"startIndex": 0},
                 headers=headers,
                 with_basic_auth=False,
                 response_status_code=400)
        self.get("/api/scim/v2/Users",
                 query_data={"count": "nope"},
                 headers=headers,
                 with_basic_auth=False,
                 response_status_code=400)

    def test_users_no_scim_enabled(self):
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        self.assertFalse(wiki.scim_enabled)
        expected_users = len(all_scim_users_by_service(wiki))

        res = self.get("/api/scim/v2/Users", headers={"Authorization": f"bearer {service_wiki_token}"},
                       with_basic_auth=False)
        self.assertEqual(expected_users, len(res["Resources"]))

    def test_user_by_external_id(self):
        jane = self.find_entity_by_name(User, user_jane_name)
        jane_external_id = jane.external_id
        postfix = self.scim_external_id_postfix()
        res = self.get(f"/api/scim/v2/Users/{jane_external_id}{postfix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False,
                       expected_headers={"Etag": version_value(jane)})
        self.assertEqual(f"{jane_external_id}{postfix}", res["externalId"])
        self.assertEqual("User", res["meta"]["resourceType"])

    def test_user_by_external_id_404(self):
        self.get("/api/scim/v2/Users/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 with_basic_auth=False,
                 response_status_code=404)

    def test_groups(self):
        service = self.find_entity_by_name(Service, service_network_name)
        expected_groups = len(all_scim_groups_by_service(service))
        res = self.get("/api/scim/v2/Groups", headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(expected_groups, len(res["Resources"]))
        self.assertEqual(expected_groups, res["totalResults"])
        self.assertEqual(1, res["startIndex"])
        self.assertEqual(expected_groups, res["itemsPerPage"])

    def test_groups_pagination(self):
        service = self.find_entity_by_name(Service, service_network_name)
        expected_groups = len(all_scim_groups_by_service(service))
        self.assertGreaterEqual(expected_groups, 3)
        start_index = 2
        count = 2
        headers = {"Authorization": f"bearer {service_network_token}"}
        res = self.get("/api/scim/v2/Groups",
                       query_data={"startIndex": start_index, "count": count},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(expected_groups, res["totalResults"])
        self.assertEqual(start_index, res["startIndex"])
        self.assertEqual(count, res["itemsPerPage"])
        self.assertEqual(count, len(res["Resources"]))

        beyond_total = expected_groups + 1
        res = self.get("/api/scim/v2/Groups",
                       query_data={"startIndex": beyond_total},
                       headers=headers,
                       with_basic_auth=False)
        self.assertEqual(expected_groups, res["totalResults"])
        self.assertEqual(beyond_total, res["startIndex"])
        self.assertEqual(0, res["itemsPerPage"])
        self.assertEqual(0, len(res["Resources"]))

    def test_collaboration_by_identifier(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration_identifier = collaboration.identifier
        postfix = self.scim_external_id_postfix()
        res = self.get(f"/api/scim/v2/Groups/{collaboration_identifier}{postfix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False,
                       expected_headers={"Etag": version_value(collaboration)})
        self.assertEqual(f"{collaboration_identifier}{postfix}", res["externalId"])
        self.assertEqual(f"{collaboration_identifier}{postfix}", res["id"])

    def test_group_by_identifier(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        group_identifier = group.identifier
        postfix = self.scim_external_id_postfix()
        # We mock that all members are already known in the remote SCIM DB
        res = self.get(f"/api/scim/v2/Groups/{group_identifier}{postfix}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(f"{group_identifier}{postfix}", res["externalId"])
        self.assertEqual(f"{group_identifier}{postfix}", res["id"])
        self.assertEqual("Group", res["meta"]["resourceType"])

    def test_collaboration_by_identifier_404(self):
        self.get("/api/scim/v2/Groups/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 with_basic_auth=False,
                 response_status_code=404)

    def test_schemas(self):
        expected = schemas_template()
        res = self.get("/api/scim/v2/Schemas")
        self.assertEqual(len(expected["Resources"]), len(res["Resources"]))
        self.assertEqual(res, expected)
        for resource in res["Resources"]:
            self.get(f"/api/scim/v2{resource['meta']['location']}", response_status_code=200)

    def test_resource_types(self):
        expected = resource_type_template()
        res = self.get("/api/scim/v2/ResourceTypes")
        self.assertEqual(len(expected["Resources"]), len(res["Resources"]))
        self.assertEqual(res, expected)
        for resource in res["Resources"]:
            self.get(f"/api/scim/v2{resource['meta']['location']}", response_status_code=200)

    def test_users_filter(self):
        expected_users = User.query.filter(func.lower(User.uid) == "urn:john").count()
        self.assertGreater(expected_users, 0)
        query = urllib.parse.quote(f"{get_scim_schema_sram_user()}.eduPersonUniqueId eq \"urn:john\"")
        res = self.get("/api/scim/v2/Users",
                       query_data={"filter": query},
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(expected_users, len(res["Resources"]))

    def test_users_filter_single_quote(self):
        expected_users = User.query.filter(func.lower(User.uid) == "urn:john").count()
        self.assertGreater(expected_users, 0)
        query = urllib.parse.quote(f"{get_scim_schema_sram_user()}.eduPersonUniqueId eq 'urn:john'")
        res = self.get("/api/scim/v2/Users",
                       query_data={"filter": query},
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(expected_users, len(res["Resources"]))

    def test_users_filter_not_implemented(self):
        query = urllib.parse.quote(f"{get_scim_schema_sram_user()}.voPersonExternalId eq 'urn:john'")
        self.get("/api/scim/v2/Users",
                 query_data={"filter": query},
                 headers={"Authorization": f"bearer {service_network_token}"},
                 with_basic_auth=False,
                 response_status_code=500)

    @responses.activate
    def test_sweep(self):
        service_id = self.find_entity_by_name(Service, service_network_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{service_id}",
                 {"scim_bearer_token": "secret"})
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            remote_groups = self.load_scim_fixture("test/scim/sweep/remote_groups_unchanged.json")
            remote_users = self.load_scim_fixture("test/scim/sweep/remote_users_unchanged.json")
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Users", json=remote_users, status=200)
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json=remote_groups, status=200)
            sweep_result = self.put("/api/scim/v2/sweep", headers={"Authorization": f"bearer {service_network_token}"},
                                    with_basic_auth=False)
            self.assertEqual(0, len(sweep_result["groups"]["created"]))
            self.assertEqual(0, len(sweep_result["users"]["created"]))
            self.assertEqual("http://localhost:8080/api/scim_mock", sweep_result["scim_url"])

            service = self.find_entity_by_name(Service, service_network_name)
            sweep_result = self.put(f"/api/scim/v2/sweep?service_id={service.id}", with_basic_auth=True)
            self.assertEqual(0, len(sweep_result["groups"]["created"]))
            self.assertEqual(0, len(sweep_result["users"]["created"]))
            self.assertEqual("http://localhost:8080/api/scim_mock", sweep_result["scim_url"])

    @responses.activate
    def test_sweep_error(self):
        service_id = self.find_entity_by_name(Service, service_network_name).id
        self.put(f"/api/services/reset_scim_bearer_token/{service_id}",
                 {"scim_bearer_token": "secret"})
        # test error response from remote SCIM server
        with responses.RequestsMock(assert_all_requests_are_fired=True) as rsps:
            rsps.add(responses.GET, "http://localhost:8080/api/scim_mock/Groups", json={"error": True},
                     status=400)
            res = self.put("/api/scim/v2/sweep", headers={"Authorization": f"bearer {service_network_token}"},
                           with_basic_auth=False, response_status_code=400)
            self.assertTrue("error" in res)
            self.assertTrue("Invalid response from remote SCIM server (got HTTP status 400)" in res["error"])

        # test HTTP error from remote SCIM server
        with mock.patch("requests.get", side_effect=requests.Timeout('Connection timed out')):
            res = self.put("/api/scim/v2/sweep", headers={"Authorization": f"bearer {service_network_token}"},
                           with_basic_auth=False, response_status_code=400)
            self.assertTrue("error" in res)
            self.assertEqual(res["error"], "Could not connect to remote SCIM server (Timeout)")

        # test other errors during SCIM sweep
        with mock.patch("requests.get", side_effect=Exception("Weird error")):
            res = self.put("/api/scim/v2/sweep", headers={"Authorization": f"bearer {service_network_token}"},
                           with_basic_auth=False, response_status_code=500)
            self.assertTrue("error" in res)
            self.assertEqual(res["error"], "Unknown error while connecting to remote SCIM server")

        # test token decryption error
        # adjust scim_url so decryption context won't match
        db.session.execute(text(f"UPDATE services SET scim_url='https://other.example.com' WHERE id = {service_id}"))
        res = self.put("/api/scim/v2/sweep", headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False, response_status_code=400)
        self.assertTrue("error" in res)
        self.assertEqual(res["error"], "Could not decrypt SCIM bearer secret")

    def test_scim_services(self):
        expected_services = Service.query.filter(Service.scim_enabled == True).count()  # noqa: E712
        self.login("urn:john")
        scim_services = self.get("/api/scim/v2/scim-services", with_basic_auth=False)
        self.assertEqual(expected_services, len(scim_services))
