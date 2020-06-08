# -*- coding: future_fstrings -*-
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name


class TestUserSaml(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})

        self.assertSetEqual(set(res.keys()), {"cuid", "uid", "sshKey", "eduPersonEntitlement"})

        self.assertListEqual(res["cuid"], ["urn:john"])
        self.assertListEqual(res["uid"], ["john"])
        self.assertEqual(1, len(res["sshKey"]))
        self.assertSetEqual(set(res["eduPersonEntitlement"]), {
            "urn:example:sbs:group:ai_computing",
            "urn:example:sbs:group:ai_computing:ai_dev",
            "urn:example:sbs:group:ai_computing:ai_res"
        })

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
