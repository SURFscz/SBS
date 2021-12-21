# -*- coding: future_fstrings -*-
import pyotp
import responses

from server.db.db import db
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
        self.assertEqual("http://127.0.0.1:3000", res["location"])

        # Coverage where there is already a second_factor_auth
        self.post("/api/mfa/verify2fa", {"totp": totp.now()}, with_basic_auth=False)

        mary = User.query.filter(User.uid == "urn:mary").first()
        self.assertEqual(secret, mary.second_factor_auth)

    def test_2fa_invalid_totp(self):
        mary = User.query.filter(User.uid == "urn:mary").first()
        mary.second_factor_auth = pyotp.random_base32()
        db.session.merge(mary)
        db.session.commit()

        self.login("urn:mary")
        self.post("/api/mfa/verify2fa", {"totp": "123456"}, with_basic_auth=False, response_status_code=400)

    def test_get_jwks(self):
        jwks = self.get("/api/mfa/jwks", with_basic_auth=False)
        self.assertEqual(1, len(jwks["keys"]))

    def test_sfo_scenario(self):
        self.login("urn:mary")
        access_token = self.sign_jwt({"sub": "urn:mary", "kid": "test"})
        res = self.get("/api/mfa/sfo", query_data={"access_token": access_token}, response_status_code=302,
                       with_basic_auth=False)
        self.assertEqual("http://127.0.0.1:3000/2fa", res.headers.get("Location"))

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

        mary = User.query.filter(User.uid == "urn:mary").one()
        mary.second_factor_auth = pyotp.random_base32()
        db.session.merge(mary)
        db.session.commit()

        body = {"current_totp": pyotp.TOTP(mary.second_factor_auth).now(),
                "new_totp_value": pyotp.TOTP(secret).now()}
        self.post("/api/mfa/update2fa", body=body)

        mary = User.query.filter(User.uid == "urn:mary").one()
        self.assertEqual(secret, mary.second_factor_auth)

    def test_update2fa_invalid_totp(self):
        self.login("urn:mary")
        self.get("/api/mfa/get2fa")["secret"]

        mary = User.query.filter(User.uid == "urn:mary").one()
        mary.second_factor_auth = pyotp.random_base32()
        db.session.merge(mary)
        db.session.commit()

        body = {"current_totp": pyotp.TOTP(mary.second_factor_auth).now(),
                "new_totp_value": "123456"}
        res = self.post("/api/mfa/update2fa", body=body, response_status_code=400)
        self.assertEqual(res["new_totp"], True)
