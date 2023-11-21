from server.db.db import db
from server.db.domain import User, Aup
from server.test.abstract_test import AbstractTest
from server.test.seed import user_sarah_name


class TestAup(AbstractTest):

    def test_links(self):
        links = self.get("/api/aup/info", response_status_code=200)
        self.assertTrue("url_aup_en" in links)
        self.assertTrue("url_aup_nl" in links)
        self.assertEqual("1", links["version"])

    def test_agree(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        db.session.delete(Aup.query.filter(Aup.user == sarah).first())

        self.login("urn:sarah")
        self.post("/api/aup/agree", with_basic_auth=False)
        user = self.client.get("/api/users/me").json
        self.assertEqual(1, len(user["aups"]))
