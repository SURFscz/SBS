import json
import urllib.parse

import mock
import requests
import responses
from sqlalchemy import text

from server.db.db import db
from server.db.domain import User, Collaboration, Group, Service
from server.scim import EXTERNAL_ID_POST_FIX
from server.scim.resource_type_template import resource_type_template
from server.scim.schema_template import schemas_template, SCIM_SCHEMA_SRAM_USER
from server.scim.user_template import version_value
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_token, user_jane_name, co_ai_computing_name, group_ai_researchers, \
    service_network_name, service_wiki_token, service_wiki_name
from server.tools import read_file


class TestScim(AbstractTest):

    def test_users(self):
        res = self.get("/api/scim/v2/Users", headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(6, len(res["Resources"]))

    def test_users_no_scim_enabled(self):
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        self.assertFalse(wiki.scim_enabled)

        res = self.get("/api/scim/v2/Users", headers={"Authorization": f"bearer {service_wiki_token}"},
                       with_basic_auth=False)
        self.assertEqual(11, len(res["Resources"]))

    def test_user_by_external_id(self):
        jane = self.find_entity_by_name(User, user_jane_name)
        jane_external_id = jane.external_id
        res = self.get(f"/api/scim/v2/Users/{jane_external_id}{EXTERNAL_ID_POST_FIX}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False,
                       expected_headers={"Etag": version_value(jane)})
        self.assertEqual(f"{jane_external_id}{EXTERNAL_ID_POST_FIX}", res["externalId"])
        self.assertEqual("User", res["meta"]["resourceType"])

    def test_user_by_external_id_404(self):
        self.get("/api/scim/v2/Users/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 with_basic_auth=False,
                 response_status_code=404)

    def test_groups(self):
        res = self.get("/api/scim/v2/Groups", headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(3, len(res["Resources"]))

    def test_collaboration_by_identifier(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration_identifier = collaboration.identifier
        res = self.get(f"/api/scim/v2/Groups/{collaboration_identifier}{EXTERNAL_ID_POST_FIX}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False,
                       expected_headers={"Etag": version_value(collaboration)})
        self.assertEqual(f"{collaboration_identifier}{EXTERNAL_ID_POST_FIX}", res["externalId"])
        self.assertEqual(f"{collaboration_identifier}{EXTERNAL_ID_POST_FIX}", res["id"])

    def test_group_by_identifier(self):
        group = self.find_entity_by_name(Group, group_ai_researchers)
        group_identifier = group.identifier
        # We mock that all members are already known in the remote SCIM DB
        res = self.get(f"/api/scim/v2/Groups/{group_identifier}{EXTERNAL_ID_POST_FIX}",
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(f"{group_identifier}{EXTERNAL_ID_POST_FIX}", res["externalId"])
        self.assertEqual(f"{group_identifier}{EXTERNAL_ID_POST_FIX}", res["id"])
        self.assertEqual("Group", res["meta"]["resourceType"])

    def test_collaboration_by_identifier_404(self):
        self.get("/api/scim/v2/Groups/nope",
                 headers={"Authorization": f"bearer {service_network_token}"},
                 with_basic_auth=False,
                 response_status_code=404)

    def test_schemas(self):
        res = self.get("/api/scim/v2/Schemas")
        self.assertEqual(4, len(res["Resources"]))
        self.assertEqual(res, schemas_template())
        for resource in res["Resources"]:
            self.get(f"/api/scim/v2{resource['meta']['location']}", response_status_code=200)

    def test_resource_types(self):
        res = self.get("/api/scim/v2/ResourceTypes")
        self.assertEqual(2, len(res["Resources"]))
        self.assertEqual(res, resource_type_template())
        for resource in res["Resources"]:
            self.get(f"/api/scim/v2{resource['meta']['location']}", response_status_code=200)

    def test_users_filter(self):
        query = urllib.parse.quote(f"{SCIM_SCHEMA_SRAM_USER}.eduPersonUniqueId eq \"urn:john\"")
        res = self.get("/api/scim/v2/Users",
                       query_data={"filter": query},
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(1, len(res["Resources"]))

    def test_users_filter_single_quote(self):
        query = urllib.parse.quote(f"{SCIM_SCHEMA_SRAM_USER}.eduPersonUniqueId eq 'urn:john'")
        res = self.get("/api/scim/v2/Users",
                       query_data={"filter": query},
                       headers={"Authorization": f"bearer {service_network_token}"},
                       with_basic_auth=False)
        self.assertEqual(1, len(res["Resources"]))

    def test_users_filter_not_implemented(self):
        query = urllib.parse.quote(f"{SCIM_SCHEMA_SRAM_USER}.voPersonExternalId eq 'urn:john'")
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
            remote_groups = json.loads(read_file("test/scim/sweep/remote_groups_unchanged.json"))
            remote_users = json.loads(read_file("test/scim/sweep/remote_users_unchanged.json"))
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
        self.login("urn:john")
        scim_services = self.get("/api/scim/v2/scim-services", with_basic_auth=False)
        self.assertEqual(4, len(scim_services))
