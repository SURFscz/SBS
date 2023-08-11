import uuid

import pyotp
from flask import current_app

from server.auth.secrets import generate_token
from server.auth.ssid import saml_auth
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_entity_id, sarah_name


class TestMfa(AbstractTest):

    def test_2fa_scenario(self):
        self.login("urn:mary")
        res = self.get("/api/mfa/get2fa")

        qr_code = res["qr_code_base64"]
        self.assertIsNotNone(qr_code)

        idp_name = res["idp_name"]
        self.assertIsNotNone(idp_name)

        secret = res["secret"]
        totp = pyotp.TOTP(secret)

        res = self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)
        self.assertEqual(self.app.app_config.base_url, res["location"])

        # Coverage where there is already a second_factor_auth
        self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)

        mary = User.query.filter(User.uid == "urn:mary").first()
        self.assertEqual(secret, mary.second_factor_auth)

    def test_ssid_scenario(self):
        # initiate proxy_authz call to initialize 2fa
        self.post("/api/users/proxy_authz", response_status_code=200,
                  body={"user_id": "urn:sarah", "service_id": service_mail_entity_id, "issuer_id": "issuer.com",
                        "uid": "sarah", "homeorganization": "ssid.org", "user_email": "sarah@ex.com",
                        "user_name": "sarah p"})
        sarah = self.find_entity_by_name(User, sarah_name)

        # start the ssid
        res = self.get(f"/api/mfa/ssid_start/{sarah.second_fa_uuid}", query_data={"continue_url": "https://foo.bar"},
                       response_status_code=302)
        saml_sso_url = saml_auth().get_sso_url()
        self.assertTrue(res.location.startswith(saml_sso_url))

        # ssid response
        xml_authn_b64 = self.get_authn_response("response.ok.xml")
        res = self.client.post("/api/users/acs", headers={},
                               data={"SAMLResponse": xml_authn_b64,
                                     "RelayState": "http://localhost:8080/api/users/acs"},
                               content_type="application/x-www-form-urlencoded")

        self.assertEqual(302, res.status_code)
        self.assertEqual("https://foo.bar", res.location)

    def test_ssid_scenario_new_user(self):
        # initiate proxy_authz call to provision user and initialize 2fa
        res = self.post("/api/users/proxy_authz", response_status_code=200,
                        body={"user_id": "urn:new_user", "service_id": self.app.app_config.oidc.sram_service_entity_id,
                              "issuer_id": "issuer.com", "uid": "new_user", "homeorganization": "ssid.org",
                              "user_email": "new_user@example.edu", "user_name": "sarah p"})
        # check that result is interrupt
        self.assertEqual(res["status"]["result"], "interrupt")
        self.assertIn(self.app.app_config.base_server_url + '/api/mfa/ssid_start/', res["status"]["redirect_url"])

        # check provisioning of new user
        new_user = User.query.filter(User.uid == "urn:new_user").first()
        self.assertIsNotNone(new_user)
        self.assertIsNotNone(new_user.name)
        self.assertIsNotNone(new_user.email)
        self.assertIsNotNone(new_user.second_fa_uuid)

        # start the ssid
        # note that the continue_url here should be end up in the final call after the user accepts the AUP
        self.get(f"/api/mfa/ssid_start/{new_user.second_fa_uuid}", query_data={"continue_url": "https://foo.bar"},
                 response_status_code=302)

        # ssid response
        xml_authn_b64 = self.get_authn_response("response.ok.xml")
        res = self.client.post("/api/users/acs", headers={},
                               data={"SAMLResponse": xml_authn_b64,
                                     "RelayState": "http://localhost:8080/api/users/acs"},
                               content_type="application/x-www-form-urlencoded")

        self.assertEqual(302, res.status_code)
        self.assertEqual(self.app.app_config.base_url + "/aup", res.location)

        res = self.post("/api/aup/agree", with_basic_auth=False)
        self.assertEqual("https://foo.bar", res["location"])

    def test_ssid_scenario_invalid_home_organisation_uid(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        sarah.second_fa_uuid = str(uuid.uuid4())
        db.session.merge(sarah)

        res = self.get(f"/api/mfa/ssid_start/{sarah.second_fa_uuid}", query_data={"continue_url": "https://foo.bar"},
                       response_status_code=302)
        self.assertEqual(self.app.app_config.base_url + "/2fa", res.headers["Location"])

    def test_2fa_invalid_totp(self):
        AbstractTest.set_second_factor_auth("urn:mary")

        self.login("urn:mary")
        self.post("/api/mfa/verify2fa", {"totp": "123456"}, with_basic_auth=False, response_status_code=400)

    def test_totp_backdoor(self):
        AbstractTest.set_second_factor_auth("urn:john")
        self.login("urn:john")
        res = self.post("/api/mfa/verify2fa", {"totp": "000000"}, with_basic_auth=False)
        self.assertEqual(self.app.app_config.base_url, res["location"])

    def test_2fa_invalid_totp_rate_limit(self):
        AbstractTest.set_second_factor_auth("urn:mary")

        self.login("urn:mary")
        config = self.app.app_config
        config.rate_limit_totp_guesses_per_30_seconds = 1

        self.post("/api/mfa/verify2fa", {"totp": "123456"}, with_basic_auth=False, response_status_code=400)
        self.post("/api/mfa/verify2fa", {"totp": "123456"}, with_basic_auth=False, response_status_code=429)

        res = self.get("/api/users/me", with_basic_auth=False)
        self.assertTrue(res["guest"])

        mary = User.query.filter(User.uid == "urn:mary").first()
        self.assertTrue(mary.suspended)

        config.rate_limit_totp_guesses_per_30_seconds = 10

    def test_token_reset_request(self):
        self.login("urn:mary")
        res = self.get("/api/mfa/token_reset_request", with_basic_auth=False)
        self.assertEqual(1, len(res))
        self.assertEqual("john@example.org", res[0]["email"])

    def test_token_reset_request_anonymous(self):
        mary = self.add_second_fa_uuid_to_user("urn:mary")
        res = self.get("/api/mfa/token_reset_request", query_data={"second_fa_uuid": mary.second_fa_uuid},
                       with_basic_auth=False)
        self.assertEqual(1, len(res))
        self.assertEqual("john@example.org", res[0]["email"])

    def test_token_reset_request_post(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.login("urn:mary")
            self.post("/api/mfa/token_reset_request", body={"email": "john@example.org", "message": "please"},
                      with_basic_auth=False)
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertTrue("please" in mail_msg.html)
            mary = User.query.filter(User.uid == "urn:mary").one()
            self.assertTrue(mary.mfa_reset_token in mail_msg.html)

    def test_token_reset_request_post_anonymous(self):
        mary = self.add_second_fa_uuid_to_user("urn:mary")
        self.assertIsNone(mary.mfa_reset_token)

        self.post("/api/mfa/token_reset_request",
                  body={"email": "john@example.org", "message": "please", "second_fa_uuid": mary.second_fa_uuid},
                  with_basic_auth=False)

        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertIsNotNone(mary.mfa_reset_token)

    def test_token_reset_request_post_invalid_email(self):
        self.login("urn:mary")
        self.post("/api/mfa/token_reset_request", body={"email": "nope@nope.org", "message": "please"},
                  with_basic_auth=False, response_status_code=403)

    def test_reset2fa(self):
        self.login("urn:mary")
        self.post("/api/mfa/token_reset_request", body={"email": "john@example.org", "message": "please"},
                  with_basic_auth=False)
        mary = User.query.filter(User.uid == "urn:mary").one()
        self.post("/api/mfa/reset2fa", body={"token": " " + mary.mfa_reset_token + " "})
        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertIsNone(mary.mfa_reset_token)
        self.assertIsNone(mary.second_factor_auth)

    def test_reset2fa_anonymous(self):
        mary = self.add_second_fa_uuid_to_user("urn:mary")
        mary.mfa_reset_token = generate_token()
        AbstractTest._merge_user(mary)

        self.post("/api/mfa/reset2fa",
                  body={"second_fa_uuid": mary.second_fa_uuid,
                        "token": mary.mfa_reset_token},
                  with_basic_auth=False)
        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertIsNone(mary.mfa_reset_token)
        self.assertIsNone(mary.second_factor_auth)

    def test_reset2fa_invalid_token(self):
        self.login("urn:mary")
        self.post("/api/mfa/reset2fa", body={"token": "nope"}, response_status_code=403)

    def test_update2fa(self):
        self.login("urn:mary")
        secret = self.get("/api/mfa/get2fa")["secret"]

        second_factor_auth = AbstractTest.set_second_factor_auth("urn:mary")

        self.post("/api/mfa/pre-update2fa", body={"totp_value": pyotp.TOTP(second_factor_auth).now()})
        self.post("/api/mfa/update2fa", body={"new_totp_value": pyotp.TOTP(secret).now()})

        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertEqual(secret, mary.second_factor_auth)

    def test_update2fa_invalid_current_totp(self):
        self.login("urn:mary")
        res = self.post("/api/mfa/update2fa", body={"new_totp_value": "123456"}, response_status_code=400)
        self.assertEqual(res["current_totp"], False)

    def test_update2fa_invalid_current_totp_value(self):
        self.set_second_factor_auth("urn:mary")
        self.login("urn:mary")
        res = self.post("/api/mfa/pre-update2fa", body={"totp_value": "123456"}, response_status_code=400)
        self.assertEqual(res["current_totp"], False)

    def test_update2fa_invalid_totp(self):
        self.login("urn:mary")
        self.get("/api/mfa/get2fa")["secret"]

        second_factor_auth = AbstractTest.set_second_factor_auth("urn:mary")

        self.post("/api/mfa/pre-update2fa", body={"totp_value": pyotp.TOTP(second_factor_auth).now()})
        res = self.post("/api/mfa/update2fa", body={"new_totp_value": "123456"}, response_status_code=400)
        self.assertFalse(res["new_totp"])

    def test_verify2fa_proxy_authz(self):
        sarah = self.add_totp_to_user("urn:sarah")

        continue_url = current_app.app_config.oidc.continue_eduteams_redirect_uri
        totp = pyotp.TOTP(sarah.second_factor_auth)
        body = {"totp": totp.now(), "second_fa_uuid": sarah.second_fa_uuid, "continue_url": continue_url}

        res = self.post("/api/mfa/verify2fa_proxy_authz", body, with_basic_auth=False)
        self.assertEqual(continue_url, res["location"])

    def test_verify2fa_proxy_authz_rate_limit(self):
        config = self.app.app_config
        config.rate_limit_totp_guesses_per_30_seconds = 1

        AbstractTest.set_second_factor_auth("urn:mary")
        mary = self.add_totp_to_user("urn:mary")
        totp = pyotp.TOTP(mary.second_factor_auth)
        error_totp = "{:06d}".format((int(totp.now()) + 1) % 1_000_000)

        payload = {
            "totp": error_totp,
            "second_fa_uuid": mary.second_fa_uuid,
            "continue_url": current_app.app_config.oidc.continue_eduteams_redirect_uri + "hallo_foo",
        }
        self.post("/api/mfa/verify2fa_proxy_authz", payload, with_basic_auth=False, response_status_code=400)
        self.post("/api/mfa/verify2fa_proxy_authz", payload, with_basic_auth=False, response_status_code=429)

        res = self.get("/api/users/me", with_basic_auth=False)
        self.assertTrue(res["guest"])

        mary = User.query.filter(User.uid == "urn:mary").first()
        self.assertTrue(mary.suspended)

        config.rate_limit_totp_guesses_per_30_seconds = 10

    def test_verify2fa_wrong_totp(self):
        sarah = self.add_totp_to_user("urn:sarah")
        body = {"totp": "123456", "second_fa_uuid": sarah.second_fa_uuid, }
        res = self.post("/api/mfa/verify2fa_proxy_authz", body, response_status_code=400, with_basic_auth=False)

        self.assertEqual(False, res["new_totp"])

    def test_verify2fa_not_allowed_continue_url(self):
        sarah = self.add_totp_to_user("urn:sarah")

        totp = pyotp.TOTP(sarah.second_factor_auth)
        body = {"totp": totp.now(), "second_fa_uuid": sarah.second_fa_uuid, "continue_url": "https://middleman.org"}
        self.post("/api/mfa/verify2fa_proxy_authz", body, response_status_code=403, with_basic_auth=False)

    def test_verify2fa_user_not_found(self):
        body = {"totp": "N/A", "second_fa_uuid": "nope", "continue_url": "N/A"}
        self.post("/api/mfa/verify2fa_proxy_authz", body, response_status_code=404, with_basic_auth=False)

    def test_get2fa_proxy_authz_new_user(self):
        sarah = self.add_second_fa_uuid_to_user("urn:sarah")
        res = self.get("/api/mfa/get2fa_proxy_authz", query_data={"second_fa_uuid": sarah.second_fa_uuid},
                       with_basic_auth=False)
        self.assertIsNotNone(res["qr_code_base64"])

    def test_get2fa_proxy_authz_missing_second_fa_uuid(self):
        self.get("/api/mfa/get2fa_proxy_authz", query_data={"second_fa_uuid": ""},
                 with_basic_auth=False, response_status_code=400)

    def test_get2fa_proxy_authz(self):
        sarah = self.add_totp_to_user("urn:sarah")
        res = self.get("/api/mfa/get2fa_proxy_authz", query_data={"second_fa_uuid": sarah.second_fa_uuid},
                       with_basic_auth=False)
        self.assertFalse("qr_code_base64" in res)

    def test_reset2fa_other(self):
        betty = self.find_entity_by_name(User, "betty")
        self.assertIsNotNone(betty.mfa_reset_token)

        self.login("urn:mary")
        self.put("/api/mfa/reset2fa_other",
                 body={"user_id": betty.id},
                 with_basic_auth=False)
        betty = self.find_entity_by_name(User, "betty")
        self.assertIsNone(betty.mfa_reset_token)
        self.assertIsNone(betty.second_factor_auth)

    def test_reset2fa_other_manager_not_allowed(self):
        betty = self.find_entity_by_name(User, "betty")
        self.login("urn:harry")
        self.put("/api/mfa/reset2fa_other",
                 body={"user_id": betty.id},
                 with_basic_auth=False,
                 response_status_code=403)
