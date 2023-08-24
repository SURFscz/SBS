import uuid
from urllib.parse import urlencode

from server.api.user_saml import SERVICE_UNKNOWN, USER_UNKNOWN, SERVICE_NOT_CONNECTED, SECOND_FA_REQUIRED, \
    status_to_string, MISSING_ATTRIBUTES
from server.db.db import db
from server.db.defaults import STATUS_EXPIRED
from server.db.domain import Collaboration, Service, User, UserLogin
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name, service_network_entity_id, service_mail_entity_id, \
    ai_computing_name, sarah_name, service_mail_name, jane_name


class TestUserSaml(AbstractTest):

    def test_proxy_authz(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com", "user_email": "sarah@ex.com",
                              "user_name": "sarah p"})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:label:uuc:ai_computing:tag_uuc"
                              ], sorted(entitlements))
        self.assertListEqual(["sarah@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["sarah"], attrs["uid"])
        self.assertIsNotNone(attrs["sshkey"][0])

        user_login = UserLogin.query.first()
        self.assertEqual(user_login.user_id, self.find_entity_by_name(User, sarah_name).id)
        self.assertEqual(user_login.service_id, self.find_entity_by_name(Service, service_mail_name).id)

    def test_proxy_authz_including_groups(self):
        self.add_service_aup_to_user("urn:jane", service_network_entity_id)
        self.login_user_2fa("urn:jane")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "https://signon.rug.nl/nidp/saml2/metadata", "uid": "sarah",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"
                              })
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual(["urn:example:sbs:group:uuc",
                              "urn:example:sbs:group:uuc:ai_computing",
                              "urn:example:sbs:group:uuc:ai_computing:ai_res",
                              "urn:example:sbs:label:uuc:ai_computing:tag_uuc"
                              ], sorted(entitlements))
        self.assertListEqual(["jane@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["jane"], attrs["uid"])
        self.assertEqual(0, len(attrs["sshkey"]))

        jane = self.find_entity_by_name(User, jane_name)
        self.assertEqual("rug.nl", jane.schac_home_organisation)
        second_fa_uuid = str(uuid.uuid4())
        jane.second_fa_uuid = second_fa_uuid
        self.save_entity(jane)

        res = self.get("/api/mfa/get2fa_proxy_authz", query_data={"second_fa_uuid": second_fa_uuid})
        self.assertEqual("University of Groningen", res["idp_name"])

    def test_proxy_authz_suspended(self):
        self.mark_user_suspended(john_name)

        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://network",
                                                        "issuer_id": "issuer.com", "uid": "sarah",
                                                        "homeorganization": "example.com",
                                                        "user_email": "sarah@ex.com", "user_name": "sarah p"},
                        response_status_code=200)
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         self.app.app_config.base_url
                         + "/service-denied?service_name=Network+Services&error_status=2"
                         + "&entity_id=https%3A%2F%2Fnetwork&issuer_id=issuer.com&user_id=urn%3Ajohn")

    def test_proxy_authz_not_active_collaborations(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        collaboration.status = STATUS_EXPIRED
        db.session.merge(collaboration)
        db.session.commit()

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        self.assertEqual(res["status"]["result"], "unauthorized")
        self.assertEqual(res["status"]["redirect_url"],
                         self.app.app_config.base_url
                         + "/service-denied?service_name=Mail+Services&error_status=5"
                         + "&entity_id=https%3A%2F%2Fmail&issuer_id=issuer.com&user_id=urn%3Asarah")

    def test_proxy_authz_no_aup(self):
        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        network_service.non_member_users_access_allowed = True
        self.save_entity(network_service)

        self.login_user_2fa("urn:jane")
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "issuer.com", "uid": "sarah", "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        self.assertEqual(res["status"]["result"], "interrupt")

        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        parameters = urlencode({"service_id": network_service.uuid4, "service_name": network_service.name})
        self.assertEqual(res["status"]["redirect_url"], f"{self.app.app_config.base_url}/service-aup?{parameters}")

    def test_proxy_authz_no_user(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:nope", "service_id": service_mail_entity_id,
                                                        "issuer_id": "https://idp.test", "uid": "sarah",
                                                        "homeorganization": "example.com",
                                                        "user_email": "sarah@ex.com", "user_name": "sarah p"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(USER_UNKNOWN, res["status"]["error_status"])

    def test_proxy_authz_no_service(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://nope",
                                                        "issuer_id": "https://idp.test", "uid": "sarah",
                                                        "homeorganization": "example.com",
                                                        "user_email": "sarah@ex.com", "user_name": "sarah p"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(SERVICE_UNKNOWN, res["status"]["error_status"])

    def test_proxy_authz_service_not_connected(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:james", "service_id": service_network_entity_id,
                                                        "issuer_id": "https://idp.test", "uid": "james",
                                                        "homeorganization": "example.com",
                                                        "user_email": "sarah@ex.com", "user_name": "sarah p"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(SERVICE_NOT_CONNECTED, res["status"]["error_status"])

    #
    # MFA scenarios:
    # logins on SBS
    def test_proxy_authz_mfa_sbs_totp(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)

        status_ = res["status"]
        self.assertEqual(status_["result"], "interrupt")
        self.assertEqual(status_["error_status"], SECOND_FA_REQUIRED)
        self.assertEqual(status_["redirect_url"], f"{self.app.app_config.base_url}/2fa/{sarah.second_fa_uuid}")

    def test_proxy_authz_mfa_sbs_totp_new_user(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:new_user",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "user_email": "sarah@example.com",
                              "homeorganization": "example.com",
                              "user_name": "sarah p"})
        self.assertEqual(res["status"]["result"], "interrupt")

        new_user = User.query.filter(User.uid == "urn:new_user").one()
        self.assertEqual("example.com", new_user.schac_home_organisation)
        self.assertEqual("sarah", new_user.home_organisation_uid)
        self.assertEqual("sarah@example.com", new_user.email)

    def test_proxy_authz_mfa_sbs_totp_sso(self):
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah",
                              "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        status_ = res["status"]
        self.assertEqual(status_["result"], "authorized")

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertFalse(sarah.ssid_required)

    def test_proxy_authz_mfa_sbs_ssid(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "https://ssid.org",
                              "uid": "sarah",
                              "homeorganization": "ssid.org",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        status_ = res["status"]
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(status_["result"], "interrupt")
        self.assertEqual(res["status"]["redirect_url"],
                         f"{self.app.app_config.base_server_url}/api/mfa/ssid_start/{sarah.second_fa_uuid}")
        self.assertTrue(sarah.ssid_required)

    def test_proxy_authz_mfa_sbs_ssid_sso(self):
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "https://ssid.org",
                              "uid": "sarah",
                              "homeorganization": "ssid.org",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "authorized")
        self.assertFalse(sarah.ssid_required)

    def test_proxy_authz_mfa_sbs_idp(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "https://idp.test",
                              "uid": "sarah",
                              "homeorganization": "idp.test",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "authorized")
        self.assertFalse(sarah.ssid_required)

    # MFA scenarios:
    # login on services
    def test_proxy_authz_mfa_service_totp(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope",
                              "uid": "sarah",
                              "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(res["status"]["redirect_url"], f"{self.app.app_config.base_url}/2fa/{sarah.second_fa_uuid}")

    def test_proxy_authz_mfa_service_totp_sso(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope",
                              "uid": "sarah",
                              "homeorganization": "example.com",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "authorized")
        self.assertFalse(sarah.ssid_required)

    def test_proxy_authz_mfa_service_ssid(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://ssid.org",
                              "uid": "sarah",
                              "homeorganization": "ssid.org",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"
                              })
        sarah = self.find_entity_by_name(User, sarah_name)

        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(res["status"]["redirect_url"],
                         f"{self.app.app_config.base_server_url}/api/mfa/ssid_start/{sarah.second_fa_uuid}")

        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertTrue(sarah.ssid_required)
        self.assertEqual("ssid.org", sarah.schac_home_organisation)
        self.assertEqual("sarah", sarah.home_organisation_uid)

    def test_proxy_authz_mfa_service_ssid_sso(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://ssid.org",
                              "uid": "sarah",
                              "homeorganization": "ssid.org"})
        sarah = self.find_entity_by_name(User, sarah_name)

        self.assertEqual(res["status"]["result"], "authorized")
        self.assertFalse(sarah.ssid_required)

    def test_proxy_authz_mfa_service_idp(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test",
                              "uid": "sarah",
                              "homeorganization": "idp.test"})
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

    def test_proxy_authz_mfa_service_idp_config(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        # config entry with only entity_id
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://only_entityid",
                              "uid": "sarah",
                              "homeorganization": "unknown_value.org"})
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

        # config entry with only schac_home_organisation
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://unknown_value.org",
                              "uid": "sarah",
                              "homeorganization": "only_sho"})
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

    def test_proxy_authz_mfa_faulty_config(self):
        res = self.post("/api/users/proxy_authz", response_status_code=500,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://erroridp.example.edu",
                              "uid": "sarah",
                              "homeorganization": "erroridp.example.edu"})
        self.assertTrue(res["error"])

        res = self.post("/api/users/proxy_authz", response_status_code=500,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "https://erroridp.example.edu",
                              "uid": "sarah",
                              "homeorganization": "erroridp.example.edu",
                              "user_email": "sarah@ex.com", "user_name": "sarah p"
                              })
        self.assertTrue(res["error"])

    def test_proxy_authz_mfa_no_ssid_attr(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope"})
        sarah = self.find_entity_by_name(User, sarah_name)
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(res["status"]["redirect_url"], f"{self.app.app_config.base_url}/2fa/{sarah.second_fa_uuid}")

    def test_proxy_authz_mfa_no_attr(self):
        res = self.post("/api/users/proxy_authz", response_status_code=500,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id})
        self.assertTrue(res["error"])

    def test_proxy_authz_expired_collaboration(self):
        self.expire_collaborations(sarah_name)
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah", "homeorganization": "example.com"})
        status = res["status"]
        self.assertEqual(4, status["error_status"])
        self.assertEqual("unauthorized", status["result"])

    def test_status_to_string(self):
        self.assertEqual("UNKNOWN_STATUS", status_to_string("nope"))

    def test_proxy_authz_missing_attribute(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:hannibal",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "idp",
                              "uid": "bla",
                              "homeorganization": "example.com"
                              })
        status_ = res["status"]
        self.assertEqual("interrupt", status_["result"], )
        self.assertEqual(MISSING_ATTRIBUTES, status_["error_status"], MISSING_ATTRIBUTES)
        self.assertTrue(f"{self.app.app_config.base_url}/missing-attributes" in status_["redirect_url"])
