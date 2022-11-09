from server.db.defaults import PAM_WEB_LOGIN, PROXY_AUTHZ_SBS, PROXY_AUTHZ, SBS_LOGIN
from server.db.models import log_user_login
from server.test.abstract_test import AbstractTest


class TestUserLogin(AbstractTest):

    def test_summary(self):
        for login_type in [SBS_LOGIN, PROXY_AUTHZ, PROXY_AUTHZ_SBS, PAM_WEB_LOGIN]:
            for i in range(3):
                log_user_login(login_type, i != 2, None, "uid", None, "entity_id")

        res = self.get("/api/user_logins/summary")
        self.assertEqual(5, len(res))
