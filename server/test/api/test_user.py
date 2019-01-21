from server.api.user import UID_HEADER_NAME
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)
        self.assertEqual(user["admin"], False)

    def test_provision_me_identity_header(self):
        user = self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid:new"}).json
        self.assertEqual(user["guest"], False)
        self.assertEqual(user["admin"], False)
        self.assertEqual(user["uid"], "uid:new")

    def test_me_existing_user(self):
        user = self.client.get("/api/users/me", headers={UID_HEADER_NAME: "urn:john"}).json

        self.assertEqual(user["guest"], False)
        self.assertEqual(user["uid"], "urn:john")

        self.assertEqual(user["organisation_memberships"][0]["organisation"]["name"], uuc_name)
        self.assertIsNotNone(user["collaboration_memberships"][0]["collaboration_id"], uuc_name)

    def test_error(self):
        self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)
