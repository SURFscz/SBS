# -*- coding: future_fstrings -*-

from server.test.abstract_test import AbstractTest
from server.test.seed import pam_session_id, service_storage_name, service_storage_token


class TestPamWebSSO(AbstractTest):

    def test_get(self):
        res = self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(res["pam_sso_session"]["attribute"], "email")
        self.assertEqual(res["service"]["name"], service_storage_name)

    def test_get_expired(self):
        self.expire_pam_session(pam_session_id)
        self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False, response_status_code=400)

    def test_start(self):
        res = self.post("/pam-websso/start",
                        body={"user_id": "roger@example.org",
                              "attribute": "email",
                              "cache_duration": 5 * 60},
                        headers={"Authorization": f"bearer {service_storage_token}"})

        self.assertEqual(res["result"], "OK")
