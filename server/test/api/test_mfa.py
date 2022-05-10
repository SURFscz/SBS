# -*- coding: future_fstrings -*-
import pyotp
import responses
from flask import current_app

from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.tools import read_file


class TestMfa(AbstractTest):

    def test_2fa_scenario(self):
        self.login("urn:mary")
        res = self.get("/api/mfa/get2fa")

        qr_code = res["qr_code_base64"]
        self.assertIsNotNone(qr_code)

        idp_name = res["idp_name"]
        self.assertEqual("example.org", idp_name)

        secret = res["secret"]
        totp = pyotp.TOTP(secret)

        res = self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)
        self.assertFalse(res["in_proxy_flow"])
        self.assertEqual("http://localhost:3000", res["location"])

        # Coverage where there is already a second_factor_auth
        self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)

        mary = User.query.filter(User.uid == "urn:mary").first()
        self.assertEqual(secret, mary.second_factor_auth)

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

    def test_get_jwks(self):
        jwks = self.get("/api/mfa/jwks", with_basic_auth=False)
        self.assertEqual(1, len(jwks["keys"]))

    def test_sfo_scenario(self):
        self.login("urn:mary")
        access_token = self.sign_jwt({"sub": "urn:mary", "kid": "test"})
        res = self.get("/api/mfa/sfo", query_data={"access_token": access_token}, response_status_code=302,
                       with_basic_auth=False)
        self.assertEqual("http://localhost:3000/2fa", res.headers.get("Location"))

        res = self.get("/api/mfa/get2fa")
        secret = res["secret"]
        totp = pyotp.TOTP(secret)
        res = self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)
        self.assertTrue(res["in_proxy_flow"])
        self.assertTrue(res["location"].startswith(f"{self.app.app_config.oidc.sfo_eduteams_redirect_uri}?id_token="))

    @responses.activate
    def test_sfo_scenario_invalid_sub(self):
        responses.add(responses.GET, self.app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        access_token = self.sign_jwt({"sub": "nope", "kid": "test"})
        res = self.get("/api/mfa/sfo", query_data={"access_token": access_token}, response_status_code=302,
                       with_basic_auth=False)
        self.assertTrue(
            res.headers.get("location").startswith(f"{self.app.app_config.oidc.sfo_eduteams_redirect_uri}?error="))

    def test_sfo_scenario_no_sec_factor(self):
        self.app.app_config.oidc.second_factor_authentication_required = False
        self.login("urn:mary")
        access_token = self.sign_jwt({"sub": "urn:mary", "kid": "test"})
        res = self.get("/api/mfa/sfo", query_data={"access_token": access_token}, response_status_code=302,
                       with_basic_auth=False)
        self.assertTrue(
            res.headers.get("location").startswith(f"{self.app.app_config.oidc.sfo_eduteams_redirect_uri}?id_token="))
        self.app.app_config.oidc.second_factor_authentication_required = True

    def test_token_reset_request(self):
        self.login("urn:mary")
        res = self.get("/api/mfa/token_reset_request", with_basic_auth=False)
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

    def test_token_reset_request_post_invalid_email(self):
        self.login("urn:mary")
        self.post("/api/mfa/token_reset_request", body={"email": "nope@nope.org", "message": "please"},
                  with_basic_auth=False, response_status_code=403)

    def test_reset2fa(self):
        self.login("urn:mary")
        self.post("/api/mfa/token_reset_request", body={"email": "john@example.org", "message": "please"},
                  with_basic_auth=False)
        mary = User.query.filter(User.uid == "urn:mary").one()
        self.post("/api/mfa/reset2fa", body={"token": mary.mfa_reset_token})
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

        body = {"current_totp": pyotp.TOTP(second_factor_auth).now(),
                "new_totp_value": pyotp.TOTP(secret).now()}
        self.post("/api/mfa/update2fa", body=body)

        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertEqual(secret, mary.second_factor_auth)

    def test_update2fa_invalid_totp(self):
        self.login("urn:mary")
        self.get("/api/mfa/get2fa")["secret"]

        second_factor_auth = AbstractTest.set_second_factor_auth("urn:mary")

        body = {"current_totp": pyotp.TOTP(second_factor_auth).now(),
                "new_totp_value": "123456"}
        res = self.post("/api/mfa/update2fa", body=body, response_status_code=400)
        self.assertEqual(res["new_totp"], True)

    def test_verify2fa_proxy_authz(self):
        sarah = self.add_totp_to_user("urn:sarah")

        continue_url = current_app.app_config.oidc.continue_eduteams_redirect_uri
        totp = pyotp.TOTP(sarah.second_factor_auth)
        body = {"totp": totp.now(), "second_fa_uuid": sarah.second_fa_uuid, "continue_url": continue_url}

        res = self.post("/api/mfa/verify2fa_proxy_authz", body, with_basic_auth=False)
        self.assertEqual(continue_url, res["location"])

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

    def test_get2fa_proxy_authz(self):
        sarah = self.add_totp_to_user("urn:sarah")
        res = self.get("/api/mfa/get2fa_proxy_authz", query_data={"second_fa_uuid": sarah.second_fa_uuid},
                       with_basic_auth=False)
        self.assertFalse("qr_code_base64" in res)
