# -*- coding: future_fstrings -*-
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name


class TestUserSaml(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})

        self.assertSetEqual(set(res.keys()), {
            "urn:mace:dir:attribute-def:cn", "urn:mace:dir:attribute-def:eduPersonPrincipalName",
            "urn:mace:dir:attribute-def:isMemberOf", "urn:mace:dir:attribute-def:mail",
            "urn:mace:dir:attribute-def:postalAddress", "urn:mace:dir:attribute-def:shortName",
            "urn:mace:dir:attribute-def:uid", "urn:oid:1.3.6.1.4.1.24552.1.1.1.13"})

        self.assertListEqual(res["urn:mace:dir:attribute-def:postalAddress"], ["Postal 1234AA"])
        self.assertListEqual(res["urn:mace:dir:attribute-def:cn"], ["John Doe"])
        self.assertListEqual(sorted(res["urn:mace:dir:attribute-def:isMemberOf"]), ["ai_computing", "ai_dev", "ai_res"])
        self.assertListEqual(sorted(res["urn:mace:dir:attribute-def:mail"]), ["john@example.org"])
        self.assertListEqual(res["urn:mace:dir:attribute-def:uid"], ["urn:john"])
        self.assertListEqual(res["urn:mace:dir:attribute-def:shortName"], ["john"])
        self.assertEqual(1, len(res["urn:oid:1.3.6.1.4.1.24552.1.1.1.13"]))
        self.assertListEqual(res["urn:mace:dir:attribute-def:eduPersonPrincipalName"],
                             ["john@ai_computing.test.sbs.local"])

    def test_attributes_no_service(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://nope"})
        self.assertDictEqual({}, res)

    def test_attributes_no_user(self):
        self.get("/api/users/attributes", response_status_code=404,
                 query_data={"uid": "nope", "service_entity_id": "https://network"})

    def test_attributes_user_suspended(self):
        self.mark_user_suspended(john_name)

        self.get("/api/users/attributes", response_status_code=404,
                 query_data={"uid": "urn:john", "service_entity_id": "https://network"})
