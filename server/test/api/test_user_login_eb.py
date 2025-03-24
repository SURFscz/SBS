import requests

from server.auth.user_codes import UserCode
from server.db.domain import UserNonce
from server.test.abstract_test import AbstractTest
from server.test.seed import (service_mail_entity_id,
                              service_wireless_entity_id, service_cloud_entity_id, sarah_nonce)


class TestUserLoginEB(AbstractTest):

    def test_authz_eb_missing_key(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=400,
                        body={"user_id": "urn:unknown",
                              "service_id": service_wireless_entity_id,
                              "issuer_id": "issuer.com",
                              "uid": "sarah"})
        message = res["message"]
        self.assertEqual("Missing key 'continue_url'", message)

    def test_authz_eb_free_rider_service(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:unknown",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_wireless_entity_id,
                              "issuer_id": "issuer.com",
                              "uid": "sarah"})
        msg = res["msg"]
        self.assertEqual("authorized", msg)
        self.assertEqual(0, len(res["attributes"]))

    def test_authz_eb_unknown_user(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:unknown",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_cloud_entity_id,
                              "issuer_id": "issuer.com",
                              "uid": "sarah"})
        self.assertEqual(UserCode.USER_UNKNOWN.name, res["message"])
        self.assertEqual("interrupt", res["msg"])

    def test_authz_eb_interrupt(self):
        res = self.post("/api/users/authz_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"user_id": "urn:sarah",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope"})
        self.assertEqual(res["msg"], "interrupt")
        self.assertTrue(res["interrupt_url"].startswith("http://localhost:8080/api/users/interrupt"))

    def test_interrupt_eb(self):
        user_nonce = UserNonce.query.filter(UserNonce.nonce == sarah_nonce).one()
        with requests.Session():
            res = self.client.get("/api/users/interrupt",
                                  query_string={"nonce": user_nonce.nonce,
                                                "error_status": UserCode.SECOND_FA_REQUIRED.value})

            self.assertEqual(f"http://localhost:3000/interrupt?error_status=101"
                             f"&continue_url={user_nonce.continue_url}",
                             res.location)

            # Now verify that a call to me returns the correct user, e.g. sarah
            user = self.client.get("/api/users/me", ).json
            self.assertFalse(user.get("admin"))
            self.assertFalse(user.get("guest"))
            self.assertFalse(user.get("second_factor_auth"))
            self.assertFalse(user.get("second_factor_confirmed"))
            self.assertEqual("urn:sarah", user.get("uid"))
            self.assertEqual("sarah@uni-franeker.nl", user.get("email"))
