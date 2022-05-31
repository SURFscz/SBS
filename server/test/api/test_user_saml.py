# -*- coding: future_fstrings -*-
from urllib.parse import urlencode

from server.api.user_saml import SERVICE_UNKNOWN, USER_UNKNOWN, SERVICE_NOT_CONNECTED, SECOND_FA_REQUIRED
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration, Service, User
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name, service_network_entity_id, service_mail_entity_id, \
    ai_computing_name, sarah_name


class TestUserSaml(AbstractTest):

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

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "ssid.org"})
        self.assertEqual(res["status"]["result"], "interrupt")

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertTrue(sarah.ssid_required)
        self.assertEqual("ssid.org", sarah.schac_home_organisation)
        self.assertEqual("sarah", sarah.home_organisation_uid)

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

    def test_proxy_authz_no_user(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:nope", "service_id": service_mail_entity_id,
                                                        "issuer_id": "https://idp.test", "uid": "sarah",
                                                        "homeorganization": "example.com"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(USER_UNKNOWN, res["status"]["error_status"])

    def test_proxy_authz_no_service(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://nope",
                                                        "issuer_id": "https://idp.test", "uid": "sarah",
                                                        "homeorganization": "example.com"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(SERVICE_UNKNOWN, res["status"]["error_status"])

    def test_proxy_authz_service_not_connected(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:betty", "service_id": service_network_entity_id,
                                                        "issuer_id": "https://idp.test", "uid": "sarah",
                                                        "homeorganization": "example.com"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(SERVICE_NOT_CONNECTED, res["status"]["error_status"])

    def test_proxy_authz_sram_login(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "example.com"})
        sarah = self.find_entity_by_name(User, sarah_name)

        status_ = res["status"]
        self.assertEqual(status_["result"], "interrupt")
        self.assertEqual(status_["error_status"], SECOND_FA_REQUIRED)
        self.assertEqual(status_["redirect_url"], f"http://localhost:3000/2fa/{sarah.second_fa_uuid}")

    def test_proxy_authz_sram_login_new_user(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:new_user",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "example.com"})
        self.assertEqual(res["status"]["result"], "interrupt")

        new_user = User.query.filter(User.uid == "urn:new_user").one()
        self.assertEqual("example.com", new_user.schac_home_organisation)
        self.assertEqual("sarah", new_user.home_organisation_uid)

    def test_proxy_authz_sram_login_ssid_required(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "ssid.org"})
        status_ = res["status"]
        self.assertEqual(status_["result"], "authorized")

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertTrue(sarah.ssid_required)

    def test_proxy_authz_sram_login_no_2fa_required(self):
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "example.com"})
        status_ = res["status"]
        self.assertEqual(status_["result"], "authorized")

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertFalse(sarah.ssid_required)
