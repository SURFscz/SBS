import urllib.parse
import uuid

import requests

from server.auth.user_codes import UserCode
from server.db.db import db
from server.db.domain import UserNonce, ServiceAup, Service, User
from server.test.abstract_test import AbstractTest
from server.test.seed import (service_mail_entity_id,
                              service_wireless_entity_id, service_cloud_entity_id, sarah_nonce, user_sarah_name,
                              service_mail_name)


class TestUserLoginEB(AbstractTest):

    def test_authz_eb_missing_key(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=400,
                        body={"user_id": "urn:unknown",
                              "service_id": service_wireless_entity_id,
                              "issuer_id": "issuer.com"})
        message = res["message"]
        self.assertEqual("Missing key 'continue_url'", message)

    def test_authz_eb_unauthorized(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": "nope",
                                 "Content-Type": "application/json"},
                        response_status_code=403,
                        body={"user_id": "unknown",
                              "service_id": service_wireless_entity_id,
                              "issuer_id": "issuer.com"})
        self.assertTrue("Forbidden" in res["message"])

    def test_authz_eb_free_rider_service(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:collab:person:unknown",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_wireless_entity_id,
                              "issuer_id": "issuer.com"})
        msg = res["msg"]
        self.assertEqual("authorized", msg)
        self.assertEqual(2, len(res["attributes"]))
        self.assertEqual("urn:collab:person:unknown", res["attributes"]["urn:mace:dir:attribute-def:uid"][0])

    def test_authz_eb_user_not_connected(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:collab:person:example.com:mary",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_cloud_entity_id,
                              "issuer_id": "issuer.com"})
        self.assertEqual("interrupt", res["msg"])
        self.assertEqual(UserCode.SERVICE_NOT_CONNECTED.name, res["message"])
        user_nonce = UserNonce.query.filter(UserNonce.nonce == res["nonce"]).one()
        self.assertEqual(user_nonce.error_status, UserCode.SERVICE_NOT_CONNECTED.value)

    def test_authz_eb_unknown_service(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:collab:person:example.com:sarah",
                              "eppn": "sarah@woods.io",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": "nope",
                              "issuer_id": "issuer.com"})
        self.assertEqual("interrupt", res["msg"])
        self.assertEqual(UserCode.SERVICE_UNKNOWN.name, res["message"])
        user_nonce = UserNonce.query.filter(UserNonce.nonce == res["nonce"]).one()
        self.assertEqual(user_nonce.error_status, UserCode.SERVICE_UNKNOWN.value)

    def test_authz_eb_unknown_user(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "unknown",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_cloud_entity_id,
                              "issuer_id": "issuer.com"})
        self.assertEqual(UserCode.USER_UNKNOWN.name, res["message"])
        self.assertEqual("interrupt", res["msg"])

    def test_authz_eb_interrupt(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        res = self.post("/api/users/authz_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"user_id": "urn:collab:person:example.com:sarah",
                              "eppn": "sarah@woods.io",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "nope"})
        self.assertEqual(res["msg"], "interrupt")
        self.assertEqual(res["message"], UserCode.SECOND_FA_REQUIRED.name)

    def test_authz_eb_service_aup(self):
        user = self.find_entity_by_name(User, user_sarah_name)
        service = self.find_entity_by_name(Service, service_mail_name)
        ServiceAup.query.filter(ServiceAup.user == user, ServiceAup.service == service).delete()
        db.session.commit()

        res = self.post("/api/users/authz_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"user_id": "urn:collab:person:example.com:sarah",
                              "eppn": "sarah@woods.io",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test"})
        self.assertEqual("interrupt", res["msg"])
        self.assertEqual(res["message"], UserCode.SERVICE_AUP_NOT_AGREED.name)

    def test_authz_eb_sbs_aup(self):
        self.remove_aup_from_user("urn:sarah")
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        res = self.post("/api/users/authz_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"user_id": "urn:collab:person:example.com:sarah",
                              "eppn": "sarah@woods.io",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": service_mail_entity_id,
                              "issuer_id": "https://idp.test"})
        self.assertEqual("interrupt", res["msg"])
        self.assertEqual(res["message"], UserCode.AUP_NOT_AGREED.name)

        # Now call attributes and ensure the aup is added
        self.add_aup_to_user("urn:sarah")
        res = self.post("/api/users/attributes_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"nonce": res["nonce"]})
        self.assertEqual("authorized", res["msg"])

    def test_authz_eb_authorized(self):
        self.add_service_aup_to_user("urn:sarah", service_mail_entity_id)
        body = {"user_id": "urn:collab:person:example.com:sarah",
                "eppn": "sarah@woods.io",
                "continue_url": "https://engine.surf.nl",
                "service_id": service_mail_entity_id,
                "issuer_id": "https://idp.test"}

        res = self.post("/api/users/authz_eb", response_status_code=200,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body=body)
        self.assertEqual("authorized", res["msg"])
        self.assertEqual(4, len(res["attributes"]))

    def test_authz_eb_sbs_login(self):
        res = self.post("/api/users/authz_eb",
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        response_status_code=200,
                        body={"user_id": "urn:unknown",
                              "continue_url": "https://engine.surf.nl",
                              "service_id": "sram",
                              "issuer_id": "issuer.com"})
        msg = res["msg"]
        self.assertEqual("authorized", msg)
        self.assertEqual(0, len(res["attributes"]))

    def test_interrupt_eb(self):
        user_nonce = UserNonce.query.filter(UserNonce.nonce == sarah_nonce).one()
        with requests.Session():
            res = self.client.get("/api/users/interrupt",
                                  query_string={"nonce": user_nonce.nonce})
            parameters = {
                "service_name": "Cloud",
                "service_id": user_nonce.service.uuid4,
                "continue_url": user_nonce.continue_url,
                "entity_id": service_cloud_entity_id,
                "issuer_id": None,
                "user_id": user_nonce.user.uid,
                "error_status": user_nonce.error_status
            }
            args = urllib.parse.urlencode(parameters)

            self.assertEqual(f"http://localhost:3000/interrupt?{args}",
                             res.location)

            # Now verify that a call to me returns the correct user, e.g. sarah
            user = self.client.get("/api/users/me", ).json
            self.assertFalse(user.get("admin"))
            self.assertFalse(user.get("guest"))
            self.assertFalse(user.get("second_factor_auth"))
            self.assertFalse(user.get("second_factor_confirmed"))
            self.assertEqual("urn:sarah", user.get("uid"))
            self.assertEqual("sarah@uni-franeker.nl", user.get("email"))

    def test_interrupt_eb_dead_end(self):
        user_nonce = UserNonce(continue_url="https://engine.surf.nl", nonce=str(uuid.uuid4()),
                               error_status=UserCode.SERVICE_UNKNOWN.value, issuer_id="https://eb",
                               requested_service_entity_id="https://cloud", requested_user_id="urn:nope")
        self.save_entity(user_nonce)
        with requests.Session():
            res = self.client.get("/api/users/interrupt",
                                  query_string={"nonce": user_nonce.nonce})
            parameters = {
                "service_name": user_nonce.requested_service_entity_id,
                "service_id": None,
                "continue_url": user_nonce.continue_url,
                "entity_id": user_nonce.requested_service_entity_id,
                "issuer_id": user_nonce.issuer_id,
                "user_id": user_nonce.requested_user_id,
                "error_status": user_nonce.error_status
            }
            args = urllib.parse.urlencode(parameters)

            self.assertEqual(f"http://localhost:3000/service-denied?{args}",
                             res.location)

            # Now verify that a call to me returns the none user
            user = self.client.get("/api/users/me", ).json
            self.assertFalse(user.get("admin"))
            self.assertTrue(user.get("guest"))
            self.assertIsNotNone(user.get("uid"))

    def test_authz_eb_nonce_not_found(self):
        res = self.post("/api/users/attributes_eb",
                        response_status_code=404,
                        headers={"Authorization": self.app.app_config.engine_block.api_token,
                                 "Content-Type": "application/json"},
                        body={"nonce": "nope"})
        self.assertTrue("No user_nonce found for none nope" in res["message"])
