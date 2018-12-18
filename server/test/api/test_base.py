from server.test.abstract_test import AbstractTest


class TestBase(AbstractTest):

    def test_health(self):
        res = self.client.get("/health")
        self.assertDictEqual({"status": "UP"}, res.json)

    def test_401(self):
        res = self.client.get("/api/stats/first_login_time")
        self.assertEqual(401, res.status_code)

    def test_500(self):
        json = self.get("public/login_aggregated", query_data={"period": "xxxx1"}, response_status_code=500)
        self.assertEqual("Invalid period xxxx1. Must match \\d{4}[QMWD]{0,1}\\d{0,3}$", json["message"])

    def test_404(self):
        res = self.client.get("/nope")
        self.assertDictEqual({'message': 'http://localhost/nope not found'}, res.json)
