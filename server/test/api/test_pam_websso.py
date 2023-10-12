from datetime import datetime, timedelta

import requests

from server.db.db import db
from server.db.domain import PamSSOSession, User, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import pam_session_id, service_storage_name, service_storage_token, \
    invalid_service_pam_session_id, roger_name


class TestPamWebSSO(AbstractTest):

    def test_get(self):
        res = self.get(f"/pam-weblogin/storage/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(res["service"]["name"], service_storage_name)
        self.assertFalse("validation" in res)

    def test_get_invalid_short_name(self):
        self.get(f"/pam-weblogin/nope/{pam_session_id}", with_basic_auth=False, response_status_code=403)

    def test_get_404(self):
        self.get("/pam-weblogin/storage/nope", with_basic_auth=False, response_status_code=404)

    def test_get_with_pin(self):
        self.login("urn:peter")
        res = self.get(f"/pam-weblogin/storage/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(service_storage_name, res["service"]["name"])
        self.assertEqual("1234", res["pin"])
        self.assertEqual("SUCCESS", res["validation"]["result"])

    def test_get_session_different_user(self):
        self.login("urn:sarah")
        res = self.get(f"/pam-weblogin/storage/{pam_session_id}", with_basic_auth=False)
        self.assertEqual("FAIL", res["validation"]["result"])

    def test_check_pin_no_service_access(self):
        self.login("urn:james")
        res = self.get(f"/pam-weblogin/storage/{invalid_service_pam_session_id}", with_basic_auth=False)
        self.assertEqual("FAIL", res["validation"]["result"])

    def test_get_expired(self):
        self.expire_pam_session(pam_session_id)
        self.get(f"/pam-weblogin/storage/{pam_session_id}", with_basic_auth=False, response_status_code=404)

    def test_start(self):
        res = self.post("/pam-weblogin/start",
                        body={"user_id": "roger@example.org",
                              "attribute": "email",
                              "cache_duration": 5 * 60},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["result"], "OK")
        self.assertEqual(res["cached"], False)
        prefix = f"Please sign in to: {self.app.app_config.base_url}/weblogin/storage/{res['session_id']}\n"
        self.assertTrue(res["challenge"].startswith(prefix))

        res = self.get(f"/pam-weblogin/storage/{res['session_id']}", with_basic_auth=False)
        self.assertEqual(res["service"]["name"], service_storage_name)

    def test_start_without_user(self):
        res = self.post("/pam-weblogin/start",
                        body={"cache_duration": 5 * 60},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["result"], "OK")
        self.assertEqual(res["cached"], False)
        prefix = f"Please sign in to: {self.app.app_config.base_url}/weblogin/storage/{res['session_id']}\n"
        self.assertTrue(res["challenge"].startswith(prefix))

        res = self.get(f"/pam-weblogin/storage/{res['session_id']}", with_basic_auth=False)
        self.assertEqual(res["service"]["name"], service_storage_name)

    def test_start_404(self):
        self.post("/pam-weblogin/start",
                  body={"user_id": "nope",
                        "attribute": "email",
                        "cache_duration": 5 * 60},
                  headers={"Authorization": f"bearer {service_storage_token}"},
                  with_basic_auth=False,
                  response_status_code=404)

    def test_start_denied(self):
        self.post("/pam-weblogin/start",
                  body={"user_id": "john@example.org",
                        "attribute": "email",
                        "cache_duration": 5 * 60},
                  headers={"Authorization": f"bearer {service_storage_token}"},
                  with_basic_auth=False,
                  response_status_code=404)

    def test_start_cached_login(self):
        self.login_user_2fa("urn:roger")
        roger = self.find_entity_by_name(User, roger_name)
        roger.pam_last_login_date = datetime.now()
        db.session.merge(roger)
        db.session.commit()

        res = self.post("/pam-weblogin/start",
                        body={"user_id": "roger@example.org",
                              "attribute": "email",
                              "cache_duration": 5 * 60},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["cached"], True)

    def test_check_pin_fail(self):
        with requests.Session():
            response = self.client.post("/pam-weblogin/check-pin",
                                        headers={"Authorization": f"bearer {service_storage_token}"},
                                        data="faulty")
            res = response.json
            self.assertEqual("FAIL", res["result"])

    def test_check_pin_no_challenge(self):
        self.login("urn:peter", user_info={"name": "urn:peter"})
        res = self.post("/pam-weblogin/check-pin",
                        body={"nope": "nope"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("FAIL", res["result"])

    def test_check_pin_success(self):
        self.login("urn:peter", user_info={"name": "urn:peter"})
        res = self.post("/pam-weblogin/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": "1234"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("SUCCESS", res["result"])
        self.assertEqual("peter", res["username"])
        self.assertEqual(1, len(res["groups"]))
        # The session must be removed
        self.get(f"/pam-weblogin/{pam_session_id}", with_basic_auth=False, response_status_code=404)
        peter = self.find_entity_by_name(User, "urn:peter")
        self.assertIsNotNone(peter.pam_last_login_date)

        service = self.find_entity_by_name(Service, service_storage_name)
        collaborations = [cm.collaboration for cm in peter.collaboration_memberships if
                          service in cm.collaboration.services]
        self.assertEqual(1, len(collaborations))
        self.assertIsNotNone(collaborations[0].last_activity_date)

    def test_check_pin_wrong_pin(self):
        self.login("urn:peter")
        res = self.post("/pam-weblogin/check-pin",
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

        res = self.post("/pam-weblogin/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": "1234"},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("TIMEOUT", res["result"])

    def test_ssh_keys(self):
        res = self.get("/pam-weblogin/ssh_keys", with_basic_auth=False,
                       headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual(1, len(res))
        self.assertEqual("some-lame-key", res[0])

    def test_anonymous_pam_websso_login_flow(self):
        res = self.post("/pam-weblogin/start",
                        body={},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        pam_session_id = res["session_id"]
        self.assertEqual(res["result"], "OK")

        self.login("urn:peter")
        res = self.get(f"/pam-weblogin/storage/{pam_session_id}", with_basic_auth=False)
        pin = res["pin"]
        self.assertEqual(res["service"]["name"], service_storage_name)

        res = self.post("/pam-weblogin/check-pin",
                        body={"session_id": pam_session_id,
                              "pin": pin},
                        with_basic_auth=False,
                        headers={"Authorization": f"bearer {service_storage_token}"})
        self.assertEqual("SUCCESS", res["result"])
        self.assertEqual("peter", res["username"])
