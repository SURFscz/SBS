from server.api.user import UID_HEADER_NAME
from server.test.abstract_test import AbstractTest


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        response = self.client.get("/api/users/me")
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], True)

    def test_me_identity_header(self):
        response = self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], False)
        self.assertEqual(response.json["uid"], "uid")

        # has the user been added to the session
        response = self.client.get("/api/users/me")
        self.assertEqual(response.json["guest"], False)

    def test_me_existing_user(self):
        response = self.client.get("/api/users/me", headers={UID_HEADER_NAME: "urn:john"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(response.json["guest"], False)
        self.assertEqual(response.json["uid"], "uid")

    def test_error(self):
        self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)
