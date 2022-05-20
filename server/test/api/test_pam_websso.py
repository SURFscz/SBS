# -*- coding: future_fstrings -*-
from datetime import datetime, timedelta

from server.db.db import db
from server.db.domain import PamSSOSession
from server.test.abstract_test import AbstractTest
from server.test.seed import pam_session_id, service_storage_name, service_storage_token, invalid_service_pam_session_id


class TestPamWebSSO(AbstractTest):

    def test_get(self):
        res = self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(res["service"]["name"], service_storage_name)
        self.assertFalse("validation" in res)

    def test_get_404(self):
        self.get("/pam-websso/nope", with_basic_auth=False, response_status_code=404)

    def test_get_with_pin(self):
        self.login("urn:peter")
        res = self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(service_storage_name, res["service"]["name"])
        self.assertEqual("1234", res["pin"])
        self.assertEqual("SUCCESS", res["validation"]["result"])

    def test_get_session_different_user(self):
        self.login("urn:sarah")
        res = self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False)
        self.assertEqual("FAIL", res["validation"]["result"])

    def test_check_pin_no_service_access(self):
        self.login("urn:james")
        res = self.get(f"/pam-websso/{invalid_service_pam_session_id}", with_basic_auth=False)
        self.assertEqual("FAIL", res["validation"]["result"])

    def test_get_expired(self):
        self.expire_pam_session(pam_session_id)
        self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False, response_status_code=404)

    def test_start(self):
        res = self.post("/pam-websso/start",
                        body={"user_id": "roger@example.org",
                              "attribute": "email",
                              "cache_duration": 5 * 60},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["result"], "OK")
        self.assertEqual(res["cached"], False)
        self.assertEqual(res["challenge"], f"{self.app.app_config.base_url}/weblogin/{res['session_id']}")

        res = self.get(f"/pam-websso/{res['session_id']}", with_basic_auth=False)
        self.assertEqual(res["service"]["name"], service_storage_name)

    def test_start_404(self):
        self.post("/pam-websso/start",
                  body={"user_id": "nope",
                        "attribute": "email",
                        "cache_duration": 5 * 60},
                  headers={"Authorization": f"bearer {service_storage_token}"},
                  with_basic_auth=False,
                  response_status_code=404)

    def test_start_denied(self):
        self.post("/pam-websso/start",
                  body={"user_id": "john@example.org",
                        "attribute": "email",
                        "cache_duration": 5 * 60},
                  headers={"Authorization": f"bearer {service_storage_token}"},
                  with_basic_auth=False,
                  response_status_code=404)

    def test_start_cached_login(self):
        self.login_user_2fa("urn:roger")
        res = self.post("/pam-websso/start",
                        body={"user_id": "roger@example.org",
                              "attribute": "email",
                              "cache_duration": 5 * 60},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["cached"], True)

    def test_check_pin_success(self):
        self.login("urn:peter")
        res = self.post("/pam-websso/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": "1234"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("SUCCESS", res["result"])
        # The session must be removed
        self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False, response_status_code=404)

    def test_check_pin_wrong_pin(self):
        self.login("urn:peter")
        res = self.post("/pam-websso/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": "nope"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("FAIL", res["result"])

    def test_check_pin_time_out(self):
        self.login("urn:peter")
        pam_sso_session = PamSSOSession.query.filter(PamSSOSession.session_id == pam_session_id).one()
        pam_sso_session.created_at = datetime.utcnow() - timedelta(days=500)
        db.session.merge(pam_sso_session)
        db.session.commit()

        res = self.post("/pam-websso/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": "1234"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("TIMEOUT", res["result"])
