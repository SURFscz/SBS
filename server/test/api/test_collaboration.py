from server.db.db import Collaboration, Organisation
from server.test.abstract_test import AbstractTest


class TestCollaboration(AbstractTest):

    def _find_by_name_id(self):
        return self.get("/api/collaborations/find_by_name", query_data={"name": "AI computing"})

    def test_search(self):
        res = self.get("/api/collaborations/search", query_data={"q": "urban"})
        self.assertEqual(1, len(res))

    def test_collaboration_new(self):
        organisation_id = Organisation.query.filter(Organisation.name == "UUC").one().id
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "organisation_id": organisation_id
                                  })
        self.assertIsNotNone(collaboration["id"])
        self.assertEqual("new_collaboration", collaboration["name"])

    def test_collaboration_update(self):
        collaboration = self._find_by_name_id()
        collaboration["name"] = "changed"
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

    def test_collaboration_delete(self):
        collaboration = self._find_by_name_id()
        self.delete("/api/collaborations", primary_key=collaboration["id"])
        self.assertEqual(0, Collaboration.query.count())

    def test_my_collaborations(self):
        self.login()
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(1, len(my_collaborations))
        collaboration = my_collaborations[0]
        self.assertEqual(1, len(collaboration["authorisation_groups"]))
        self.assertEqual(2, len(collaboration["collaboration_memberships"]))
        self.assertEqual(1, len(collaboration["join_requests"]))
        self.assertEqual(1, len(collaboration["invitations"]))

        collaboration = self.get(f"/api/collaborations/{collaboration['id']}")
        researcher = list(filter(lambda cm: cm["role"] == "researcher", collaboration["collaboration_memberships"]))[0]
        self.assertEqual("John Doe", researcher["user_service_profiles"][0]["name"])
