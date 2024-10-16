import datetime

from server.auth.user_codes import UserCode
from server.db.db import db
from server.db.domain import Collaboration, Service, User, UserLogin
from server.test.abstract_test import AbstractTest
from server.test.seed import (user_john_name, service_network_entity_id, service_mail_entity_id,
                              co_ai_computing_name, user_sarah_name, service_mail_name, unihard_short_name)
from server.tools import dt_now


class TestUserSaml(AbstractTest):

    def test_proxy_authz(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah"})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual([
            f"urn:example:sbs:group:{unihard_short_name}",
            f"urn:example:sbs:group:{unihard_short_name}:ai_computing",
            f"urn:example:sbs:label:{unihard_short_name}:ai_computing:tag_uuc"
        ], sorted(entitlements))
        self.assertListEqual(["sarah@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["sarah"], attrs["uid"])
        self.assertIsNotNone(attrs["sshkey"][0])

        user_login = UserLogin.query.first()
        self.assertEqual(user_login.user_id, self.find_entity_by_name(User, user_sarah_name).id)
        self.assertEqual(user_login.service_id, self.find_entity_by_name(Service, service_mail_name).id)

    def test_proxy_authz_including_groups(self):
        self.add_service_aup_to_user("urn:jane", service_network_entity_id)
        self.login_user_2fa("urn:jane")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "https://idp.uni-franeker.nl/", "uid": "sarah"})
        attrs = res["attributes"]
        entitlements = attrs["eduPersonEntitlement"]
        self.assertListEqual([
            f"urn:example:sbs:group:{unihard_short_name}",
            f"urn:example:sbs:group:{unihard_short_name}:ai_computing",
            f"urn:example:sbs:group:{unihard_short_name}:ai_computing:ai_res",
            f"urn:example:sbs:label:{unihard_short_name}:ai_computing:tag_uuc"
        ], sorted(entitlements))
        self.assertListEqual(["jane@test.sram.surf.nl"], attrs["eduPersonPrincipalName"])
        self.assertListEqual(["jane"], attrs["uid"])
        self.assertEqual(0, len(attrs["sshkey"]))

    def test_proxy_authz_suspended(self):
        self.mark_user_suspended(user_john_name)

        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://network",
                                                        "issuer_id": "issuer.com", "uid": "urn:john",
                                                        "homeorganization": "example.com"},
                        response_status_code=200)
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(res["status"]["error_status"], UserCode.USER_IS_SUSPENDED.value)

    def test_proxy_authz_not_active_collaborations(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.expiry_date = dt_now() - datetime.timedelta(days=50)
        db.session.merge(collaboration)
        db.session.commit()

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test",
                              "uid": "sarah"})
        self.assertEqual(res["status"]["result"], "unauthorized")

        self.assertEqual(UserCode.SERVICE_NOT_CONNECTED.value, res["status"]["error_status"])
        query_dict = self.url_to_query_dict(res["status"]["redirect_url"])
        self.assertEqual(query_dict["error_status"], str(UserCode.SERVICE_NOT_CONNECTED.value))

    def test_proxy_authz_no_aup(self):
        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        network_service.non_member_users_access_allowed = True
        self.save_entity(network_service)

        self.login_user_2fa("urn:jane")
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:jane", "service_id": service_network_entity_id,
                              "issuer_id": "issuer.com", "uid": "sarah"})
        self.assertEqual(res["status"]["result"], "interrupt")

        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()

        query_dict = self.url_to_query_dict(res["status"]["redirect_url"])
        self.assertEqual(query_dict["service_id"], network_service.uuid4)
        self.assertEqual(query_dict["service_name"], network_service.name)

    def test_proxy_authz_free_ride(self):
        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        network_service.non_member_users_access_allowed = True
        self.save_entity(network_service)

        # user unknown is SBS
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:gandalf", "service_id": service_network_entity_id,
                              "issuer_id": "issuer.com", "uid": "gandalf"})
        self.assertEqual(res["status"]["result"], "interrupt")

        network_service = Service.query.filter(Service.entity_id == service_network_entity_id).one()
        redirect_url = res["status"]["redirect_url"]
        self.assertTrue(redirect_url.startswith(f"{self.app.app_config.base_url}/interrupt"))

        query_dict = self.url_to_query_dict(redirect_url)
        self.assertEqual(str(UserCode.NEW_FREE_RIDE_USER.value), query_dict["error_status"])
        self.assertEqual(network_service.uuid4, query_dict["service_id"])

    def test_proxy_authz_no_user(self):
        res = self.post("/api/users/proxy_authz", body={
            "user_id": "urn:nope",
            "service_id": service_mail_entity_id,
            "issuer_id": "https://idp.test",
            "uid": "nope"},
                        response_status_code=200)
        self.assertEqual("interrupt", res["status"]["result"])
        self.assertEqual(UserCode.USER_UNKNOWN.value, res["status"]["error_status"])

    def test_proxy_authz_no_service(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:john", "service_id": "https://nope",
                                                        "issuer_id": "https://idp.test", "uid": "sarah", },
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(UserCode.SERVICE_UNKNOWN.value, res["status"]["error_status"])

    def test_proxy_authz_service_not_connected(self):
        res = self.post("/api/users/proxy_authz", body={"user_id": "urn:james", "service_id": service_network_entity_id,
                                                        "issuer_id": "https://idp.test", "uid": "james"},
                        response_status_code=200)
        self.assertEqual("unauthorized", res["status"]["result"])
        self.assertEqual(UserCode.SERVICE_NOT_CONNECTED.value, res["status"]["error_status"])

    #
    # MFA scenarios:
    # logins on SBS
    def test_proxy_authz_mfa_sbs_totp(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah"})
        status_ = res["status"]
        self.assertEqual(status_["result"], "authorized")

    def test_proxy_authz_mfa_sbs_totp_new_user(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:new_user",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah"})
        self.assertEqual(res["status"]["result"], "authorized")

    def test_proxy_authz_mfa_sbs_totp_sso(self):
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "idp",
                              "uid": "sarah"})
        status_ = res["status"]
        self.assertEqual("authorized", status_["result"])

    # MFA scenarios:
    # login on services
    def test_proxy_authz_mfa_service_totp(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope",
                              "uid": "sarah"})
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertTrue(res["status"]["redirect_url"].startswith(f"{self.app.app_config.base_url}/interrupt"))

    def test_proxy_authz_mfa_service_totp_sso(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope"})
        self.assertEqual("authorized", res["status"]["result"], )

    def test_proxy_authz_mfa_service_ssid_sso(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://ssid.org"})
        self.assertEqual("authorized", res["status"]["result"])

    def test_proxy_authz_mfa_service_idp(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test"
                              })
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

    def test_proxy_authz_mfa_service_idp_config(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)

        # config entry with only entity_id
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://only_entityid"})
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

        # config entry with only schac_home_organisation
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://unknown_value.org",
                              "uid": "sarah"})
        self.assertEqual(res["status"]["result"], "authorized")
        attrs = res["attributes"]
        self.assertListEqual(["sarah"], attrs["uid"])

    def test_proxy_authz_mfa(self):
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope"})
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertEqual(UserCode.SECOND_FA_REQUIRED.value, res["status"]["error_status"])

    def test_proxy_authz_mfa_no_attr(self):
        res = self.post("/api/users/proxy_authz", response_status_code=500,
                        body={"user_id": "urn:sarah",
                              "service_id": service_mail_entity_id})
        self.assertTrue(res["error"])

    def test_proxy_authz_expired_collaboration(self):
        self.expire_collaborations(user_sarah_name)
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah"})
        status = res["status"]
        self.assertEqual(UserCode.SERVICE_NOT_CONNECTED.value, status["error_status"])
        self.assertEqual("unauthorized", status["result"])

    def test_proxy_authz_no_aup_agreed(self):
        self.remove_aup_from_user("urn:sarah")
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        self.login_user_2fa("urn:sarah")

        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                              "uid": "sarah"})
        status = res["status"]
        self.assertEqual(UserCode.AUP_NOT_AGREED.value, status["error_status"])
        self.assertEqual("interrupt", status["result"])
