from server.test.abstract_test import AbstractTest


class TestAup(AbstractTest):

    def test_links(self):
        links = self.get("/api/aup", response_status_code=200)
        self.assertEqual(True, "pdf" in links)
        self.assertEqual(True, "html" in links)

    def test_agree(self):
        self.login()
        self.post("/api/aup/agree", with_basic_auth=False)
        user = self.client.get("/api/users/me").json
        self.assertEqual(1, len(user["aups"]))
