# -*- coding: future_fstrings -*-
import datetime
import json
import time

from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, STATUS_EXPIRED, STATUS_SUSPENDED
from server.db.domain import Collaboration, Organisation, Invitation, CollaborationMembership, User
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER, RESTRICTED_CO_API_AUTH_HEADER
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name, uva_research_name, john_name, \
    ai_computing_short_name, service_network_entity_id, service_wiki_entity_id, service_storage_entity_id, \
    service_cloud_entity_id, uuc_teachers_name
from server.test.seed import uuc_secret, uuc_name


class TestCollaboration(AbstractTest):

    def _find_by_identifier(self, with_basic_auth=True):
        return self.get("/api/collaborations/find_by_identifier",
                        query_data={"identifier": collaboration_ai_computing_uuid},
                        with_basic_auth=with_basic_auth)

    def test_find_by_identifier(self):
        self.login("urn:james")
        collaboration = self.get("/api/collaborations/find_by_identifier",
                                 query_data={"identifier": collaboration_ai_computing_uuid},
                                 with_basic_auth=False)
        self.assertSetEqual({"id", "name", "admins", "disable_join_requests", "accepted_user_policy", "organisation",
                             "logo", "description", "member_count", "group_count", "services", "website_url",
                             "disclose_member_information"},
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
                                          "short_name": "new_short_name",
                                          "current_user_admin": False
                                      }, with_basic_auth=False)

            self.assertIsNotNone(collaboration["id"])
            self.assertIsNotNone(collaboration["identifier"])
            self.assertEqual("uuc:new_short_name", collaboration["global_urn"])
            self.assertEqual(STATUS_ACTIVE, collaboration["status"])
            self.assertEqual(2, len(outbox))
            self.assertTrue(
                "You have been invited by urn:john to join collaboration new_collaboration" in outbox[0].html)

            count = self._collaboration_membership_count(collaboration)
            self.assertEqual(0, count)

    def test_collaboration_new_with_current_user_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.login("urn:john")
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "organisation_id": organisation_id,
                                      "administrators": ["the@ex.org", "that@ex.org"],
                                      "short_name": "new_short_name",
                                      "current_user_admin": True
                                  }, with_basic_auth=False)

        count = self._collaboration_membership_count(collaboration)
        self.assertEqual(1, count)

    def test_collaboration_without_default_current_user_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.login("urn:john")
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "organisation_id": organisation_id,
                                      "administrators": [],
                                      "short_name": "new_short_name",
                                      "current_user_admin": False
                                  }, with_basic_auth=False)

        count = self._collaboration_membership_count(collaboration)
        self.assertEqual(0, count)

    @staticmethod
    def _collaboration_membership_count(collaboration):
        return CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .filter(CollaborationMembership.collaboration_id == collaboration["id"]) \
            .filter(User.uid == "urn:john") \
            .count()

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

    def test_collaboration_restricted_access_api_with_schac_home(self):
        res = self.post("/api/collaborations/v1/restricted",
                        body={
                            "name": "new_collaboration",
                            "administrator": "mdoe",
                            "short_name": "short_collab_name",
                            "connected_services": [service_cloud_entity_id]
                        },
                        with_basic_auth=False,
                        headers=RESTRICTED_CO_API_AUTH_HEADER,
                        response_status_code=201)

        self.assertEqual("uva:short_collab_nam", res["global_urn"])

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
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["name"] = "changed"
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

    def test_collaboration_update_short_name(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["short_name"] = "changed"
        self.put("/api/collaborations", body=collaboration)

        groups = self.find_entity_by_name(Collaboration, ai_computing_name).groups
        for group in groups:
            self.assertTrue("changed" in group.global_urn)

    def test_collaboration_delete(self):
        pre_count = Collaboration.query.count()
        collaboration = self._find_by_identifier()
        self.delete("/api/collaborations", primary_key=collaboration["id"])
        self.assertEqual(pre_count - 1, Collaboration.query.count())

    def test_collaboration_delete_no_admin(self):
        collaboration = self._find_by_identifier()
        self.login("urn:peter")
        response = self.client.delete(f"/api/collaborations/{collaboration['id']}")
        self.assertEqual(403, response.status_code)

    def test_collaboration_by_id_forbidden(self):
        collaboration = self._find_by_identifier(with_basic_auth=True)
        self.login("urn:peter")
        self.get(f"/api/collaborations/{collaboration['id']}", response_status_code=403, with_basic_auth=False)

    def test_collaboration_by_id_not_found(self):
        self.login("urn:john")
        self.get(f"/api/collaborations/{-1}", response_status_code=404, with_basic_auth=False)

    def test_non_existing_collaboration_by_id_not_found(self):
        self.login("urn:james")
        self.get("/api/collaborations/99999999999", response_status_code=403, with_basic_auth=False)

    def test_collaboration_all(self):
        collaborations = self.get("/api/collaborations/all")
        self.assertEqual(4, len(collaborations))

    def test_collaboration_by_id(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual("UUC", collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)

    def test_collaboration_by_id_service_connection_requests(self):
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        service_connection_requests = collaboration["service_connection_requests"]
        self.assertEqual(1, len(service_connection_requests))

    def test_collaboration_by_id_api_call(self):
        collaboration_id = self._find_by_identifier()["id"]
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
        self.assertTrue("collaboration_memberships_count" in collaboration)
        self.assertTrue("invitations_count" in collaboration)

        collaboration = self.get(f"/api/collaborations/{collaboration['id']}")
        researcher = list(filter(lambda cm: cm["role"] == "member", collaboration["collaboration_memberships"]))[0]
        self.assertEqual("John Doe", researcher["user"]["name"])

    def test_my_collaborations_include_services(self):
        self.login("urn:admin")
        my_collaborations = self.get("/api/collaborations", query_data={"includeServices": True})
        self.assertEqual(1, len(my_collaborations))

        services = my_collaborations[0]
        self.assertTrue(len(services) > 0)

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

    def test_collaboration_invites(self):
        pre_count = Invitation.query.count()
        self.login("urn:john")
        collaboration_id = self._find_by_identifier()["id"]
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/collaborations/invites", body={
                "collaboration_id": collaboration_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join",
                "membership_expiry_date": int(time.time()),
                "intended_role": "admin"
            })
            post_count = Invitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)
            invitation = Invitation.query.filter(Invitation.invitee_email == "new@example.org").first()
            self.assertEqual("admin", invitation.intended_role)
            self.assertIsNotNone(invitation.membership_expiry_date)

    def test_collaboration_invites_preview(self):
        self.login("urn:john")
        collaboration_id = self._find_by_identifier()["id"]
        res = self.post("/api/collaborations/invites-preview", body={
            "collaboration_id": collaboration_id,
            "message": "Please join",
            "intended_role": "admin"
        })
        self.assertTrue("Please join" in res["html"])

    def test_collaboration_invites_preview_member(self):
        self.login("urn:john")
        collaboration_id = self._find_by_identifier()["id"]
        res = self.post("/api/collaborations/invites-preview", body={
            "collaboration_id": collaboration_id
        })
        self.assertFalse("administrative duties" in res["html"])
        self.assertFalse("Personal" in res["html"])

    def test_collaboration_lite_by_id(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login("urn:jane")
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")
        self.assertEqual(ai_computing_name, collaboration["name"])

    def test_collaboration_lite_no_member(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login("urn:roger")
        self.get(f"/api/collaborations/lite/{collaboration_id}", response_status_code=403)

    def test_collaboration_lite_not_existing_collaboration(self):
        self.login("urn:roger")
        self.get("/api/collaborations/lite/99999999999", response_status_code=403)

    def test_collaboration_lite_disclose_member_information(self):
        self.login("urn:sarah")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration["collaboration_memberships"]
        self.assertEqual(4, len(memberships))
        user = memberships[0]["user"]
        self.assertTrue("email" in user)

    def test_collaboration_lite_disclose_email_information(self):
        self.login("urn:roger")
        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration["collaboration_memberships"]
        self.assertEqual(4, len(memberships))
        user = memberships[0]["user"]
        self.assertTrue("name" in user)
        self.assertFalse("email" in user)

        user = memberships[2]["user"]
        self.assertTrue("name" in user)
        self.assertTrue("email" in user)

    def test_collaboration_lite_disclose_no_information(self):
        self.login("urn:betty")
        collaboration_id = self.find_entity_by_name(Collaboration, uuc_teachers_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration.get("collaboration_memberships")
        self.assertFalse("user" in memberships[0])

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
        self.assertEqual(0, len(collaboration.collaboration_memberships))

        count = Invitation.query.filter(Invitation.collaboration_id == collaboration.id).count()
        self.assertEqual(2, count)

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
                                        "short_name": f"1{ai_computing_short_name}"
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

    def test_collaborations_may_request_collaboration_true(self):
        self.login("urn:mary")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertTrue(res)

    def test_collaborations_may_request_collaboration_false(self):
        self.login("urn:mike")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertFalse(res)

    def test_collaborations_may_request_collaboration_none(self):
        self.login("urn:jane")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertFalse(res)

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

    def _do_test_collaboration_update_expiration_date(self, pre_status, expiry_date, post_status):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        collaboration.status = pre_status
        db.session.merge(collaboration)
        db.session.commit()

        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration.id}", with_basic_auth=False)
        collaboration["expiry_date"] = expiry_date
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual(post_status, collaboration["status"])

    def test_collaboration_update_expiration_date_with_expiry_date(self):
        self._do_test_collaboration_update_expiration_date(STATUS_EXPIRED, time.time() + (60 * 60 * 24 * 365),
                                                           STATUS_ACTIVE)

    def test_collaboration_update_expiration_date_without_expiry_date(self):
        self._do_test_collaboration_update_expiration_date(STATUS_EXPIRED, None, STATUS_ACTIVE)

    def test_collaboration_update_expiration_date_with_suspended(self):
        self._do_test_collaboration_update_expiration_date(STATUS_SUSPENDED, None, STATUS_ACTIVE)

    def test_unsuspend(self):
        coll = self.find_entity_by_name(Collaboration, ai_computing_name)
        coll.last_activity_date = datetime.datetime.now() - datetime.timedelta(days=365)
        coll.status = STATUS_SUSPENDED
        db.session.merge(coll)
        db.session.commit()

        self.put("/api/collaborations/unsuspend", body={"collaboration_id": coll.id})
        coll = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(STATUS_ACTIVE, coll.status)
        self.assertTrue(coll.last_activity_date > datetime.datetime.now() - datetime.timedelta(hours=1))
