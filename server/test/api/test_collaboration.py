from server.db.db import Collaboration, Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name, uuc_name


class TestCollaboration(AbstractTest):

    def _find_by_name_id(self):
        return self.get("/api/collaborations/find_by_name", query_data={"name": "AI computing"}, with_basic_auth=False)

    def test_search(self):
        res = self.get("/api/collaborations/search", query_data={"q": "ComPuti"})
        self.assertEqual(1, len(res))

    def test_search_wildcard(self):
        res = self.get("/api/collaborations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_members(self):
        members = self.get("/api/collaborations/members", query_data={"identifier": collaboration_ai_computing_uuid})
        self.assertEqual(1, len(members))

        member = members[0]
        self.assertEqual("urn:john", member["uid"])
        self.assertEqual("John Doe", member["name"])
        self.assertFalse("email" in member)

    def test_collaboration_new(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.login("urn:john")
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "organisation_id": organisation_id
                                  }, with_basic_auth=False)
        self.assertIsNotNone(collaboration["id"])
        self.assertIsNotNone(collaboration["identifier"])
        self.assertEqual("new_collaboration", collaboration["name"])

    def test_collaboration_new_no_organisation_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.login("urn:peter")
        self.post("/api/collaborations",
                  body={
                      "name": "new_collaboration",
                      "organisation_id": organisation_id
                  },
                  with_basic_auth=False,
                  response_status_code=403)

    def test_collaboration_update(self):
        collaboration = self._find_by_name_id()
        collaboration["name"] = "changed"
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

    def test_collaboration_delete(self):
        collaboration = self._find_by_name_id()
        self.delete("/api/collaborations", primary_key=collaboration["id"])
        self.assertEqual(1, Collaboration.query.count())

    def test_collaboration_delete_no_admin(self):
        collaboration = self._find_by_name_id()
        self.login("urn:peter")
        response = self.client.delete(f"/api/collaborations/{collaboration['id']}")
        self.assertEqual(403, response.status_code)

    def test_collaboration_by_id_not_found(self):
        collaboration = self._find_by_name_id()
        self.login("urn:peter")
        self.get(f"/api/collaborations/{collaboration['id']}", response_status_code=404, with_basic_auth=False)

    def test_collaboration_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual("UUC", collaboration["organisation"]["name"])

    def test_my_collaborations(self):
        self.login()
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(1, len(my_collaborations))
        collaboration = AbstractTest.find_by_name(my_collaborations, ai_computing_name)
        self.assertEqual(1, len(collaboration["authorisation_groups"]))
        self.assertTrue(len(collaboration["collaboration_memberships"]) > 0)
        self.assertTrue(len(collaboration["join_requests"]) > 0)
        self.assertTrue(len(collaboration["invitations"]) > 0)

        collaboration = self.get(f"/api/collaborations/{collaboration['id']}")
        researcher = list(filter(lambda cm: cm["role"] == "researcher", collaboration["collaboration_memberships"]))[0]
        self.assertEqual("John Doe", researcher["user_service_profiles"][0]["name"])

    def test_collaboration_name_exists(self):
        res = self.get("/api/collaborations/name_exists", query_data={"name": ai_computing_name})
        self.assertEqual(True, res)

        res = self.get("/api/collaborations/name_exists",
                       query_data={"name": ai_computing_name, "existing_collaboration": ai_computing_name.upper()})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc", "existing_collaboration": "xyc"})
        self.assertEqual(False, res)
