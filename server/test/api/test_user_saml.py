# -*- coding: future_fstrings -*-
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name, uuc_scheduler_entity_id, service_network_entity_id


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

    def test_attributes_service_linked_to_organisation(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:sarah", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:sarah"])

    def test_attributes_service_linked_to_organisation_membership(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:mary", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:mary"])

    def test_attributes_service_linked_to_organisation_collaboration_membership(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:betty", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:betty"])

    def test_attributes_service_not_connected(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:betty", "service_entity_id": service_network_entity_id})
        self.assertDictEqual({}, res)

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
