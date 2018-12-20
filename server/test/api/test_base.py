from server.test.abstract_test import AbstractTest


class TestBase(AbstractTest):

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"status": "UP"}, res.json)

    def test_401(self):
        res = self.client.get("/api/users")
        self.assertEqual(401, res.status_code)

    def test_404(self):
        res = self.get("/api/nope", response_status_code=404)
        self.assertDictEqual({'message': 'http://localhost/api/nope not found'}, res)
