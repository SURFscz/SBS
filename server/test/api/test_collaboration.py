from base64 import b64encode

from server.db.db import Collaboration, Organisation, Invitation
from server.test.abstract_test import AbstractTest
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name, uuc_name, uva_research_name, john_name


class TestCollaboration(AbstractTest):

    def _find_by_name_id(self, name=ai_computing_name, with_basic_auth=False):
        return self.get("/api/collaborations/find_by_name", query_data={"name": name},
                        with_basic_auth=with_basic_auth)

    def test_find_by_name_id(self):
        collaboration = self.get("/api/collaborations/find_by_name", query_data={"name": uva_research_name},
                                 with_basic_auth=False)
        self.assertListEqual(["id", "name"], list(collaboration.keys()))

    def test_search(self):
        self.login("urn:john")
        res = self.get("/api/collaborations/search", query_data={"q": "ComPuti"})
        self.assertEqual(1, len(res))

    def test_search_forbidden(self):
        self.login("unr:roger")
        self.get("/api/collaborations/search", query_data={"q": "ComPuti"}, response_status_code=403,
                 with_basic_auth=False)

    def test_search_wildcard(self):
        self.login("urn:john")
        res = self.get("/api/collaborations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_members(self):
        members = self.get("/api/collaborations/members", query_data={"identifier": collaboration_ai_computing_uuid})
        self.assertEqual(2, len(members))

        member = self.find_by_name(members, john_name)
        self.assertEqual("urn:john", member["uid"])
        self.assertEqual("John Doe", member["name"])
        self.assertFalse("email" in member)

    def test_members_forbidden(self):
        self.login("urn:mary")
        self.get("/api/collaborations/members", query_data={"identifier": collaboration_ai_computing_uuid},
                 response_status_code=403, with_basic_auth=False)

    def test_collaboration_new(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.login("urn:john")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            collaboration = self.post("/api/collaborations",
                                      body={
                                          "name": "new_collaboration",
                                          "organisation_id": organisation_id,
                                          "administrators": ["the@ex.org", "that@ex.org"]
                                      }, with_basic_auth=False)

            self.assertIsNotNone(collaboration["id"])
            self.assertIsNotNone(collaboration["identifier"])
            self.assertEqual(2, len(outbox))

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
        collaboration_id = self._find_by_name_id()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
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

    def test_collaboration_by_id_forbidden(self):
        collaboration = self._find_by_name_id(with_basic_auth=True)
        self.login("urn:peter")
        self.get(f"/api/collaborations/{collaboration['id']}", response_status_code=403, with_basic_auth=False)

    def test_collaboration_by_id_not_found(self):
        self.login("urn:john")
        self.get(f"/api/collaborations/{-1}", response_status_code=404, with_basic_auth=False)

    def test_collaboration_all(self):
        collaborations = self.get("/api/collaborations/all")
        self.assertEqual(2, len(collaborations))

    def test_collaboration_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual("UUC", collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)

    def test_collaboration_by_id_api_call(self):
        collaboration_id = self._find_by_name_id()["id"]
        collaboration = self.get(f"/api/collaborations/{collaboration_id}",
                                 headers={"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"},
                                 with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual("UUC", collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)

    def test_my_collaborations(self):
        self.login("urn:admin")
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(1, len(my_collaborations))
        collaboration = AbstractTest.find_by_name(my_collaborations, ai_computing_name)
        self.assertTrue(len(collaboration["authorisation_groups"]) > 0)
        self.assertTrue(len(collaboration["collaboration_memberships"]) > 0)
        self.assertTrue(len(collaboration["join_requests"]) > 0)
        self.assertTrue(len(collaboration["invitations"]) > 0)

        collaboration = self.get(f"/api/collaborations/{collaboration['id']}")
        researcher = list(filter(lambda cm: cm["role"] == "member", collaboration["collaboration_memberships"]))[0]
        self.assertEqual("John Doe", researcher["user"]["name"])

    def test_my_collaborations_no_admin(self):
        self.login("urn:james")
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(0, len(my_collaborations))

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

    def test_collaboration_services_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        collaboration = self.get(f"/api/collaborations/services/{collaboration_id}",
                                 query_data={"include_memberships": True})

        self.assertTrue(len(collaboration["collaboration_memberships"]) > 0)
        self.assertTrue(len(collaboration["services"]) > 0)

        collaboration = self.get(f"/api/collaborations/services/{collaboration_id}")
        self.assertTrue("collaboration_memberships" not in collaboration)

    def test_collaboration_authorisation_groups_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        collaboration = self.get(f"/api/collaborations/authorisation_groups/{collaboration_id}")

        self.assertTrue(len(collaboration["authorisation_groups"]) > 0)

    def test_collaboration_invites(self):
        pre_count = Invitation.query.count()
        self.login("urn:john")
        collaboration_id = self._find_by_name_id()["id"]
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/collaborations/invites", body={
                "collaboration_id": collaboration_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join",
                "intended_role": "admin"
            })
            post_count = Invitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)
            invitations = Invitation.query.filter(Invitation.invitee_email == "new@example.org").all()
            self.assertEqual("admin", invitations[0].intended_role)

    def test_my_collaborations_lite(self):
        self.login("urn:jane")
        collaborations = self.get("/api/collaborations/my_lite")
        self.assertEqual(1, len(collaborations))

    def test_my_collaborations_lite_no_member(self):
        self.login("urn:harry")
        collaborations = self.get("/api/collaborations/my_lite")
        self.assertEqual(0, len(collaborations))

    def test_collaboration_lite_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login("urn:jane")
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")
        self.assertEqual(ai_computing_name, collaboration["name"])

    def test_collaboration_lite_no_member(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login("urn:harry")
        self.get(f"/api/collaborations/lite/{collaboration_id}", response_status_code=403)
