from server.test.abstract_test import AbstractTest


class TestBase(AbstractTest):

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"status": "UP"}, res.json)

    def test_404(self):
        res = self.get("/api/nope", response_status_code=404)
        self.assertDictEqual({'message': 'http://localhost/api/nope not found'}, res)

    def test_git_info(self):
        res = self.client.get("/info")
        self.assertTrue("git" in res.json)

    def test_401(self):
        self.get("/api/users/search", with_basic_auth=False, response_status_code=401)
