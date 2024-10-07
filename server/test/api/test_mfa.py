import pyotp
import requests
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
        self.assertIsNotNone(idp_name)

        secret = res["secret"]
        totp = pyotp.TOTP(secret)

        res = self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)
        self.assertEqual(self.app.app_config.base_url, res["location"])

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
        self.assertTrue(mary.rate_limited)
        self.assertIsNotNone(mary.mfa_reset_token)
        self.assertIsNone(mary.second_factor_auth)

        # Need to log in again to set up session
        self.login("urn:mary")
        # The user is rate limited and can't try again
        self.post("/api/mfa/verify2fa", {"totp": "123456"}, with_basic_auth=False, response_status_code=429)

        config.rate_limit_totp_guesses_per_30_seconds = 10

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
        self.post("/api/mfa/reset2fa", body={"token": f" {mary.mfa_reset_token} "})
        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertIsNone(mary.mfa_reset_token)
        self.assertIsNone(mary.second_factor_auth)
        self.assertFalse(mary.rate_limited)

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
        self.assertFalse(betty.rate_limited)

    def test_reset2fa_other_manager_not_allowed(self):
        betty = self.find_entity_by_name(User, "betty")
        self.login("urn:harry")
        self.put("/api/mfa/reset2fa_other",
                 body={"user_id": betty.id},
                 with_basic_auth=False,
                 response_status_code=403)

    @responses.activate
    def test_2fa_scenario_no_mfa(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token", "id_token": self.sign_jwt({"acr": "nope"})},
                      status=200)
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint,
                      json={"sub": "urn:john"}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        with requests.Session():
            self.client.get("/api/users/resume-session?code=123456")
            res = self.get("/api/mfa/get2fa", with_basic_auth=False)
            self.assertIsNotNone(res.get("qr_code_base64"))
