# -*- coding: future_fstrings -*-
import os
from urllib.parse import urlencode

from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration, Service, User
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name, uuc_scheduler_entity_id, service_network_entity_id, service_mail_entity_id, \
    ai_computing_name, sarah_name


class TestUserSaml(AbstractTest):

    def test_attributes(self):
        self.add_service_aup_to_user("urn:john", "https://network")
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})

        self.assertSetEqual(set(res.keys()), {"cuid", "uid", "sshKey", "eduPersonEntitlement"})

        self.assertListEqual(res["cuid"], ["urn:john"])
        self.assertListEqual(res["uid"], ["john"])
        self.assertEqual(1, len(res["sshKey"]))
        self.assertSetEqual(set(res["eduPersonEntitlement"]), {
            "urn:example:sbs:group:uuc",
            "urn:example:sbs:group:uuc:ai_computing",
            "urn:example:sbs:group:uuc:ai_computing:ai_dev",
            "urn:example:sbs:group:uuc:ai_computing:ai_res"
        })

    def test_attributes_service_linked_to_organisation(self):
        self.add_service_aup_to_user("urn:sarah", uuc_scheduler_entity_id)
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:sarah", "service_entity_id": uuc_scheduler_entity_id})
        self.assertListEqual(res["cuid"], ["urn:sarah"])

    def test_attributes_service_linked_to_organisation_membership_not_supported(self):
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:mary", "service_entity_id": uuc_scheduler_entity_id})
        self.assertDictEqual(res, {})

    def test_attributes_service_linked_to_organisation_collaboration_membership(self):
        self.add_service_aup_to_user("urn:betty", uuc_scheduler_entity_id)
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
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:sarah", "service_entity_id": service_mail_entity_id})
        entitlements = res["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing"
                              ], sorted(entitlements))

    def test_attributes_user_limit_linked_collaborations_including_group(self):
        self.add_service_aup_to_user("urn:jane", service_network_entity_id)
        res = self.get("/api/users/attributes",
                       query_data={"uid": "urn:jane", "service_entity_id": service_network_entity_id})
        entitlements = res["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:group:uuc:ai_computing:ai_res"
                              ], sorted(entitlements))

    def test_proxy_authz(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com"})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing"
                              ], sorted(entitlements))
        self.assertListEqual(["sarah@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["sarah"], attrs["uid"])
        self.assertIsNotNone(attrs["sshkey"][0])

    def test_proxy_authz_ssid_required(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        self.post("/api/users/proxy_authz", response_status_code=200,
                  body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                        "uid": "sarah", "homeorganization": "ssid.org"})

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertTrue(sarah.ssid_required)

    def test_proxy_authz_including_groups(self):
        self.add_service_aup_to_user("urn:jane", service_network_entity_id)
        self.login_user_2fa("urn:jane")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "issuer.com", "uid": "sarah", "homeorganization": "example.com"})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:group:uuc:ai_computing:ai_res"
                              ], sorted(entitlements))
        self.assertListEqual(["jane@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["jane"], attrs["uid"])
        self.assertEqual(0, len(attrs["sshkey"]))

    def test_proxy_authz_suspended(self):
        self.mark_user_suspended(john_name)

        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://network",
                                                        "issuer_id": "issuer.com", "uid": "sarah",
                                                        "homeorganization": "example.com"},
                        response_status_code=200)
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         "http://localhost:3000/service-denied?service_name=Network+Services&error_status=2")

    def test_proxy_authz_not_active_collaborations(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        collaboration.status = STATUS_EXPIRED
        db.session.merge(collaboration)
        db.session.commit()

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com"})
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         "http://localhost:3000/service-denied?service_name=Mail+Services&error_status=5")

    def test_proxy_authz_not_active_membership(self):
        self.expire_all_collaboration_memberships(sarah_name)
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com"})
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         "http://localhost:3000/service-denied?service_name=Mail+Services&error_status=6")

    def test_non_member_users_access_allowed(self):
        self.add_service_aup_to_user("urn:jane", "https://wireless")
        res = self.get("/api/users/attributes", query_data={"uid": "urn:jane", "service_entity_id": "https://wireless"})
        self.assertEqual(0, len(res["eduPersonEntitlement"]))

    def test_attributes_no_aup(self):
        self.get("/api/users/attributes",
                 query_data={"uid": "urn:john", "service_entity_id": "https://network"},
                 response_status_code=403)

    def test_proxy_authz_no_aup(self):
        self.login_user_2fa("urn:jane")

        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "issuer.com", "uid": "sarah", "homeorganization": "example.com"})
        self.assertEqual(res["status"]["result"], "interrupt")

        parameters = urlencode({"service_id": network_service.uuid4, "service_name": network_service.name})
        self.assertEqual(res["status"]["redirect_url"], f"http://localhost:3000/service-aup?{parameters}")

    def test_proxy_authz_no_2fa(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "nope",
                              "uid": "sarah", "homeorganization": "example.com"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(res["status"]["redirect_url"], f"http://localhost:3000/2fa/{sarah.second_fa_uuid}")

    def test_proxy_authz_allowed_idp(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test", "uid": "sarah", "homeorganization": "example.com"})
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])
