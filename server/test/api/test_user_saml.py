# -*- coding: future_fstrings -*-
import os

from server.test.abstract_test import AbstractTest
from server.test.seed import john_name, uuc_scheduler_entity_id, service_network_entity_id, service_mail_entity_id


class TestUserSaml(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})

        self.assertSetEqual(set(res.keys()), {"cuid", "uid", "sshKey", "eduPersonEntitlement"})

        self.assertListEqual(res["cuid"], ["urn:john"])
        self.assertListEqual(res["uid"], ["john"])
        self.assertEqual(1, len(res["sshKey"]))
        self.assertSetEqual(set(res["eduPersonEntitlement"]), {
            "urn:example:sbs:group:uuc:ai_computing",
            "urn:example:sbs:group:uuc:ai_computing:ai_dev",
            "urn:example:sbs:group:uuc:ai_computing:ai_res"
        })

    def test_attributes_service_linked_to_organisation(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:sarah", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:sarah"])

    def test_attributes_service_linked_to_organisation_membership_not_supported(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:mary", "service_entity_id": uuc_scheduler_entity_id})
        self.assertDictEqual(res, {})

    def test_attributes_service_linked_to_organisation_collaboration_membership(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:betty", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:betty"])

    def test_attributes_service_not_connected(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:betty", "service_entity_id": service_network_entity_id})
        self.assertDictEqual({}, res)

    def test_attributes_no_service(self):
        try:
            del os.environ["TESTING"]
            self.app.app_config.mail.send_exceptions = True
            mail = self.app.mail
            with mail.record_messages() as outbox:
                res = self.get("/api/users/attributes",
                               query_data={"uid": "urn:john", "service_entity_id": "https://nope"})
                self.assertDictEqual({}, res)
                html = outbox[0].html
                self.assertTrue("Returning unauthorized for user urn:john and service_"
                                "entity_id https://nope as the service is unknown" in html)
                self.assertTrue("An error occurred in local" in html)
        finally:
            os.environ["TESTING"] = "1"
            self.app.app_config.mail.send_exceptions = False

    def test_attributes_no_user(self):
        self.get("/api/users/attributes", response_status_code=404,
                 query_data={"uid": "nope", "service_entity_id": "https://network"})

    def test_attributes_user_suspended(self):
        self.mark_user_suspended(john_name)

        self.get("/api/users/attributes", response_status_code=404,
                 query_data={"uid": "urn:john", "service_entity_id": "https://network"})

    def test_attributes_user_limit_linked_collaborations(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:sarah", "service_entity_id": service_mail_entity_id})
        entitlements = res["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:group:uuc:ai_computing:ai_dev",
                              "urn:example:sbs:group:uuc:ai_computing:ai_res"
                              ], sorted(entitlements))

    def test_proxy_authz(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:group:uuc:ai_computing:ai_dev",
                              "urn:example:sbs:group:uuc:ai_computing:ai_res"
                              ], sorted(entitlements))
        self.assertListEqual(["sarah@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["sarah"], attrs["uid"])
        self.assertIsNotNone(attrs["sshkey"][0])

    def test_proxy_authz_suspended(self):
        self.mark_user_suspended(john_name)

        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://network"},
                        response_status_code=200)
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         "http://localhost:3000/service-denied?service_name=Network+Services&error_status=2")
