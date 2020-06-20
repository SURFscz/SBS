# -*- coding: future_fstrings -*-
import json

from server.db.domain import Collaboration, Organisation, Invitation
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER, RESTRICTED_CO_API_AUTH_HEADER
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name, uva_research_name, john_name, \
    ai_computing_short_name, service_network_entity_id, service_wiki_entity_id, service_storage_entity_id, \
    service_cloud_entity_id
from server.test.seed import uuc_secret, uuc_name


class TestCollaboration(AbstractTest):

    def _find_by_name_id(self, name=ai_computing_name, with_basic_auth=False):
        return self.get("/api/collaborations/find_by_name", query_data={"name": name},
                        with_basic_auth=with_basic_auth)

    def test_find_by_name_id(self):
        collaboration = self.get("/api/collaborations/find_by_name", query_data={"name": uva_research_name},
                                 with_basic_auth=False)
        self.assertSetEqual({"id", "name", "admin_email", "disable_join_requests", "accepted_user_policy"},
                            set(collaboration.keys()))

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
                                          "administrators": ["the@ex.org", "that@ex.org"],
                                          "short_name": "new_short_name"
                                      }, with_basic_auth=False)

            self.assertIsNotNone(collaboration["id"])
            self.assertIsNotNone(collaboration["identifier"])
            self.assertEqual("uuc:new_short_name", collaboration["global_urn"])
            self.assertEqual(2, len(outbox))

    def test_collaboration_no_organisation_context(self):
        self.login("urn:john")
        self.post("/api/collaborations",
                  body={
                      "name": "new_collaboration",
                      "administrators": ["the@ex.org", "that@ex.org"],
                      "short_name": "new_short_name"
                  }, with_basic_auth=False,
                  response_status_code=400)

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

    def test_collaboration_restricted_access_api(self):
        res = self.post("/api/collaborations/v1/restricted",
                        body={
                            "name": "new_collaboration",
                            "administrator": "harry",
                            "short_name": "short_org_name",
                            "connected_services": [service_network_entity_id,
                                                   service_wiki_entity_id,
                                                   service_storage_entity_id,
                                                   service_cloud_entity_id]
                        },
                        with_basic_auth=False,
                        headers=RESTRICTED_CO_API_AUTH_HEADER,
                        response_status_code=201)

        self.assertEqual("uuc:short_org_name", res["global_urn"])
        self.assertListEqual([service_cloud_entity_id, service_storage_entity_id],
                             list(map(lambda s: s["entity_id"], res["services"])))

        collaboration = self.find_entity_by_name(Collaboration, res["name"])
        self.assertEqual(1, len(collaboration.collaboration_memberships))

        admin = collaboration.collaboration_memberships[0]
        self.assertEqual("admin", admin.role)
        self.assertEqual("urn:harry", admin.user.uid)

    def test_collaboration_restricted_access_api_forbidden_without_correct_scope(self):
        self.login("urn:harry")
        self.post("/api/collaborations/v1/restricted",
                  body={},
                  with_basic_auth=False,
                  headers=API_AUTH_HEADER,
                  response_status_code=403)

    def test_collaboration_restricted_access_api_forbidden_without_api_user(self):
        self.login("urn:harry")
        self.post("/api/collaborations/v1/restricted",
                  body={},
                  with_basic_auth=False,
                  response_status_code=403)

    def test_collaboration_restricted_invalid_admin(self):
        res = self.post("/api/collaborations/v1/restricted",
                        body={
                            "name": "new_collaboration",
                            "administrator": "nope"
                        },
                        with_basic_auth=False,
                        headers=RESTRICTED_CO_API_AUTH_HEADER,
                        response_status_code=400)
        self.assertEqual("Administrator nope is not a valid user", res["message"])

    def test_collaboration_restricted_no_default_schac(self):
        default_organisation = self.app.app_config.restricted_co.default_organisation
        self.app.app_config.restricted_co.default_organisation = "bogus"
        self.post("/api/collaborations/v1/restricted",
                  body={
                      "name": "new_collaboration",
                      "administrator": "harry",
                      "short_name": "short_org_name",
                      "connected_services": []
                  },
                  with_basic_auth=False,
                  headers=RESTRICTED_CO_API_AUTH_HEADER,
                  response_status_code=400)
        self.app.app_config.restricted_co.default_organisation = default_organisation

    def test_collaboration_update(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["name"] = "changed"
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

    def test_collaboration_update_short_name(self):
        collaboration_id = self._find_by_name_id()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["short_name"] = "changed"
        self.put("/api/collaborations", body=collaboration)

        groups = self.find_entity_by_name(Collaboration, ai_computing_name).groups
        for group in groups:
            self.assertTrue("changed" in group.global_urn)

    def test_collaboration_update_restricted_service(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        self.login("urn:admin")
        self.mark_collaboration_service_restricted(collaboration_id)

        collaboration_json = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration_json["services_restricted"] = False
        self.put("/api/collaborations", body=collaboration_json)

        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertTrue(collaboration.services_restricted)

    def test_collaboration_delete(self):
        collaboration = self._find_by_name_id()
        self.delete("/api/collaborations", primary_key=collaboration["id"])
        self.assertEqual(2, Collaboration.query.count())

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
        self.assertEqual(3, len(collaborations))

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
                                 headers=API_AUTH_HEADER,
                                 with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual("UUC", collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)

    def test_my_collaborations(self):
        self.login("urn:admin")
        my_collaborations = self.get("/api/collaborations")
        self.assertEqual(1, len(my_collaborations))
        collaboration = AbstractTest.find_by_name(my_collaborations, ai_computing_name)
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
        organisation_id = self.find_entity_by_name(Collaboration, ai_computing_name).organisation_id
        other_organisation_id = self.find_entity_by_name(Collaboration, uva_research_name).organisation_id

        res = self.get("/api/collaborations/name_exists", query_data={"name": ai_computing_name,
                                                                      "organisation_id": organisation_id})
        self.assertEqual(True, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": ai_computing_name,
                                                                      "organisation_id": other_organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists",
                       query_data={"name": ai_computing_name, "existing_collaboration": ai_computing_name.upper(),
                                   "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc",
                                                                      "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc", "existing_collaboration": "xyc",
                                                                      "organisation_id": organisation_id})
        self.assertEqual(False, res)

    def test_collaboration_short_name_exists(self):
        organisation_id = self.find_entity_by_name(Collaboration, ai_computing_name).organisation_id
        other_organisation_id = self.find_entity_by_name(Collaboration, uva_research_name).organisation_id

        res = self.get("/api/collaborations/short_name_exists", query_data={"short_name": ai_computing_short_name,
                                                                            "organisation_id": organisation_id})
        self.assertEqual(True, res)

        res = self.get("/api/collaborations/short_name_exists", query_data={"short_name": ai_computing_short_name,
                                                                            "organisation_id": other_organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/short_name_exists",
                       query_data={"short_name": ai_computing_name,
                                   "existing_collaboration": ai_computing_short_name.upper(),
                                   "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/short_name_exists", query_data={"short_name": "xyc",
                                                                            "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/short_name_exists",
                       query_data={"short_name": "xyc", "existing_collaboration": "xyc",
                                   "organisation_id": organisation_id})
        self.assertEqual(False, res)

    def test_collaboration_services_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        collaboration = self.get(f"/api/collaborations/services/{collaboration_id}",
                                 query_data={"include_memberships": True})

        self.assertTrue(len(collaboration["collaboration_memberships"]) > 0)
        self.assertTrue(len(collaboration["services"]) > 0)

        collaboration = self.get(f"/api/collaborations/services/{collaboration_id}")
        self.assertTrue("collaboration_memberships" not in collaboration)

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

    def test_collaboration_invites_preview(self):
        self.login("urn:john")
        collaboration_id = self._find_by_name_id()["id"]
        res = self.post("/api/collaborations/invites-preview", body={
            "collaboration_id": collaboration_id,
            "message": "Please join",
            "intended_role": "admin"
        })
        self.assertTrue("administrative duties" in res["html"])
        self.assertTrue("Please join" in res["html"])

    def test_collaboration_invites_preview_member(self):
        self.login("urn:john")
        collaboration_id = self._find_by_name_id()["id"]
        res = self.post("/api/collaborations/invites-preview", body={
            "collaboration_id": collaboration_id
        })
        self.assertFalse("administrative duties" in res["html"])
        self.assertFalse("Personal" in res["html"])

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

    def test_api_call(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "new_short_name"
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)
        collaboration = AbstractTest.find_entity_by_name(Collaboration, "new_collaboration")
        admin = list(filter(lambda m: m.role == "admin", collaboration.collaboration_memberships))[0]
        self.assertEqual("john@example.org", admin.user.email)

    def test_api_call_existing_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": ai_computing_name,
                                        "administrators": ["the@ex.org"],
                                        "short_name": "new_short_name"
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertEqual(data["message"],
                         "Collaboration with name 'AI computing' already exists within organisation 'UUC'.")

    def test_api_call_existing_short_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org"],
                                        "short_name": ai_computing_short_name
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertEqual(data["message"],
                         "Collaboration with short_name 'ai_computing' already exists within organisation 'UUC'.")

    def test_api_call_no_api(self):
        self.login("urn:john")
        response = self.client.post("/api/collaborations/v1",
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org"],
                                        "short_name": ai_computing_short_name
                                    }),
                                    content_type="application/json")
        self.assertEqual(403, response.status_code)
        data = response.json
        self.assertEqual(data["message"], "Not associated with an API key")

    def test_collaboration_groups_by_id(self):
        collaboration_id = self._find_by_name_id()["id"]
        collaboration = self.get(f"/api/collaborations/groups/{collaboration_id}")
        self.assertEqual(2, len(collaboration["groups"]))

    def test_access_allowed_super_user(self):
        self.login("urn:john")
        data = self.get(
            f"/api/collaborations/access_allowed/{self.find_entity_by_name(Collaboration, ai_computing_name).id}")
        self.assertEqual("full", data["access"])

    def _access_allowed(self, urn, response_status_code=200):
        self.login(urn)
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        return self.get(f"/api/collaborations/access_allowed/{collaboration_id}",
                        response_status_code=response_status_code)

    def test_access_allowed_organisation_admin(self):
        data = self._access_allowed("urn:mary")
        self.assertEqual("full", data["access"])

    def test_access_allowed_collaboration_admin(self):
        data = self._access_allowed("urn:admin")
        self.assertEqual("full", data["access"])

    def test_access_allowed_collaboration_member(self):
        data = self._access_allowed("urn:sarah")
        self.assertEqual("lite", data["access"])

    def test_no_access_allowed(self):
        self._access_allowed("urn:roger", response_status_code=403)
