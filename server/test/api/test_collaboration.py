from server.db.db import Collaboration, Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name


class TestCollaboration(AbstractTest):

    def _find_by_name_id(self):
        return self.get("/api/collaborations/find_by_name", query_data={"name": "AI computing"}, with_basic_auth=False)

    def test_search(self):
        res = self.get("/api/collaborations/search", query_data={"q": "ComPuti"})
        self.assertEqual(1, len(res))

    def test_members(self):
        members = self.get("/api/collaborations/members", query_data={"identifier": collaboration_ai_computing_uuid})
        self.assertEqual(1, len(members))

        member = members[0]
        self.assertEqual("urn:john", member["uid"])
        self.assertEqual("John Doe", member["name"])
        self.assertFalse("email" in member)

    def test_collaboration_new(self):
        organisation_id = Organisation.query.filter(Organisation.name == "UUC").one().id
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "organisation_id": organisation_id
                                  })
        self.assertIsNotNone(collaboration["id"])
        self.assertIsNotNone(collaboration["identifier"])
        self.assertEqual("new_collaboration", collaboration["name"])

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
        collaboration = self._find_by_name_id()
        self.login()
        collaboration_id = self.get(f"/api/collaborations/{collaboration['id']}", with_basic_auth=False)["id"]
        self.assertEqual(collaboration["id"], collaboration_id)

    def test_my_collaborations(self):
        self.login()
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(1, len(my_collaborations))
        collaboration = AbstractTest.find_by_name(my_collaborations, ai_computing_name)
        self.assertEqual(1, len(collaboration["authorisation_groups"]))
        self.assertEqual(2, len(collaboration["collaboration_memberships"]))
        self.assertEqual(2, len(collaboration["join_requests"]))
        self.assertEqual(1, len(collaboration["invitations"]))

        collaboration = self.get(f"/api/collaborations/{collaboration['id']}")
        researcher = list(filter(lambda cm: cm["role"] == "researcher", collaboration["collaboration_memberships"]))[0]
        self.assertEqual("John Doe", researcher["user_service_profiles"][0]["name"])
