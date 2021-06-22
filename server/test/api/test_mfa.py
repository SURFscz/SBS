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
        self.assertEqual("http://localhost:3000", res["location"])

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
