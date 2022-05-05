# -*- coding: future_fstrings -*-

from server.test.abstract_test import AbstractTest
from server.test.seed import pam_session_id, service_storage_name


class TestPamWebSSO(AbstractTest):

    def test_get(self):
        res = self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False)
        self.assertEqual(res["pam_sso_session"]["attribute"], "email")
        self.assertEqual(res["service"]["name"], service_storage_name)

    def test_get_expired(self):
        self.expire_pam_session(pam_session_id)
        self.get(f"/pam-websso/{pam_session_id}", with_basic_auth=False, response_status_code=400)

    # def test_introspect_not_connected(self):
    #     db.session.execute(text("DELETE from services_collaborations"))
    #     res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
    #                            data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
    #     self.assertEqual(200, res.status_code)
    #     self.assertEqual(res.json["active"], False)
    #     self.assertEqual(res.json["status"], "token-not-connected")
