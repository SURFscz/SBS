from server.api.user import UID_HEADER_NAME
from server.db.db import Organisation, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name, ai_computing_name


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

    def test_search(self):
        self.login("urn:john")
        res = self.get("/api/users/search", query_data={"q": "roger"})
        self.assertEqual(1, len(res))

        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id

        res = self.get("/api/users/search", query_data={"q": "john", "organisation_id": organisation_id})
        self.assertEqual(1, len(res))

        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/users/search", query_data={"q": "john",
                                                        "organisation_id": organisation_id,
                                                        "collaboration_id": collaboration_id})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/search", query_data={"q": "*",
                                                        "collaboration_admins": True})
        self.assertEqual(2, len(res))

        res = self.get("/api/users/search", query_data={"q": "*",
                                                        "organisation_admins": True})
        self.assertEqual(3, len(res))

    def test_other_not_allowed(self):
        self.get("/api/users/other", query_data={"uid": "urn:mary"}, response_status_code=403)

    def test_refresh_not_allowed(self):
        self.login("urn:roger")
        self.get("/api/users/refresh", response_status_code=403)

    def test_other_missing_query_parameter(self):
        self.login("urn:john")
        self.get("/api/users/other", response_status_code=400)

    def test_other(self):
        self.login("urn:john")
        res = self.get("/api/users/other", query_data={"uid": "urn:mary"})
        self.assertEqual("Mary Doe", res["name"])

    def test_error(self):
        self.client.get("/api/users/me", headers={UID_HEADER_NAME: "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)
