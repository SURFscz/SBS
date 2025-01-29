import base64
import datetime
import json
import time

from server.api.collaboration import generate_short_name
from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, STATUS_EXPIRED, STATUS_SUSPENDED
from server.db.domain import Collaboration, Organisation, Invitation, CollaborationMembership, User, Group, \
    ServiceGroup, Tag, Service
from server.db.models import flatten
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER
from server.test.seed import (co_ai_computing_uuid, co_ai_computing_name, co_research_name, user_john_name,
                              co_ai_computing_short_name, co_teachers_name, read_image, co_research_uuid,
                              service_group_wiki_name1,
                              service_storage_name, unifra_secret, unifra_name, unihard_short_name,
                              unifra_unit_cloud_name, unifra_unit_infra_name, unihard_secret_unit_support)
from server.test.seed import unihard_name
from server.tools import dt_now


class TestCollaboration(AbstractTest):

    def _find_by_identifier(self, with_basic_auth=True):
        return self.get("/api/collaborations/find_by_identifier",
                        query_data={"identifier": co_ai_computing_uuid},
                        with_basic_auth=with_basic_auth)

    def test_find_by_identifier(self):
        self.login("urn:james")
        collaboration = self.get("/api/collaborations/find_by_identifier",
                                 query_data={"identifier": co_ai_computing_uuid},
                                 with_basic_auth=False)
        self.assertEqual(collaboration["identifier"], co_ai_computing_uuid)

    def test_search(self):
        self.login("urn:john")
        res = self.get("/api/collaborations/search", query_data={"q": "ComPuti"}, with_basic_auth=False)
        self.assertEqual(1, len(res))

    def test_search_forbidden(self):
        self.login("urn:roger")
        self.get("/api/collaborations/search", query_data={"q": "ComPuti"}, response_status_code=403,
                 with_basic_auth=False)

    def test_search_wildcard(self):
        self.login("urn:john")
        res = self.get("/api/collaborations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_members(self):
        members = self.get("/api/collaborations/members", query_data={"identifier": co_ai_computing_uuid})
        self.assertEqual(2, len(members))

        member = self.find_by_name(members, user_john_name)
        self.assertEqual("urn:john", member["uid"])
        self.assertEqual("John Doe", member["name"])
        self.assertFalse("email" in member)

    def test_members_forbidden(self):
        self.login("urn:mary")
        self.get("/api/collaborations/members", query_data={"identifier": co_ai_computing_uuid},
                 response_status_code=403, with_basic_auth=False)

    def test_collaboration_new(self):
        organisation = Organisation.query.filter(Organisation.name == unihard_name).one()
        organisation_id = organisation.id
        self.login("urn:john")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            collaboration = self.post("/api/collaborations",
                                      body={
                                          "name": "new_collaboration",
                                          "description": "new_collaboration",
                                          "organisation_id": organisation_id,
                                          "administrators": ["the@ex.org", "that@ex.org"],
                                          "short_name": "new_short_name",
                                          "current_user_admin": False
                                      }, with_basic_auth=False)

            self.assertIsNotNone(collaboration["id"])
            self.assertIsNotNone(collaboration["identifier"])
            self.assertEqual(f"{unihard_short_name}:new_short_name", collaboration["global_urn"])
            self.assertEqual(STATUS_ACTIVE, collaboration["status"])
            self.assertEqual(2, len(outbox))

            count = self._collaboration_membership_count(collaboration)
            self.assertEqual(0, count)

    def test_collaboration_new_with_current_user_admin(self):
        wiki_service_group = self.find_entity_by_name(ServiceGroup, service_group_wiki_name1)
        wiki_service_group.auto_provision_members = True
        db.session.merge(wiki_service_group)
        db.session.commit()

        organisation = Organisation.query.filter(Organisation.name == unihard_name).one()
        self.login("urn:john")
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "description": "new_collaboration",
                                      "organisation_id": organisation.id,
                                      "administrators": ["the@ex.org", "that@ex.org"],
                                      "short_name": "new_short_name",
                                      "current_user_admin": True
                                  }, with_basic_auth=False)

        count = self._collaboration_membership_count(collaboration)
        self.assertEqual(1, count)

        organisation = Organisation.query.filter(Organisation.name == unihard_name).one()
        service_groups = flatten([service.service_groups for service in organisation.services])
        collaboration_groups = self.find_entity_by_name(Collaboration, collaboration["name"]).groups

        self.assertEqual(2, len(service_groups))
        self.assertEqual(2, len(collaboration_groups))
        service_group_names = sorted([sg.name for sg in service_groups])
        co_group_names = sorted([co.name for co in collaboration_groups])
        self.assertListEqual(service_group_names, co_group_names)

        wiki_group = self.find_entity_by_name(Group, co_group_names[0])
        self.assertEqual(1, len(wiki_group.collaboration_memberships))
        self.assertEqual("urn:john", wiki_group.collaboration_memberships[0].user.uid)
        self.assertEqual(service_group_names[0], wiki_group.service_group.name)

    def test_collaboration_without_default_current_user_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == unihard_name).one().id
        self.login("urn:john")
        collaboration = self.post("/api/collaborations",
                                  body={
                                      "name": "new_collaboration",
                                      "description": "new_collaboration",
                                      "organisation_id": organisation_id,
                                      "administrators": [],
                                      "short_name": "new_short_name",
                                      "current_user_admin": False
                                  }, with_basic_auth=False)

        count = self._collaboration_membership_count(collaboration)
        self.assertEqual(0, count)

    def test_collaboration_with_tags(self):
        organisation_id = Organisation.query.filter(Organisation.name == unihard_name).one().id

        tag_existing = "tag_uuc"
        tag_just_valid = "just_valid-234567890123456789012"
        tag_too_long = "invalid__--2345678901234567890123"
        tag_digit_start = "123_valid"

        body = {
            "name": "new_collaboration",
            "description": "new_collaboration",
            "organisation_id": organisation_id,
            "administrators": [],
            "short_name": "short__",
            "current_user_admin": False
        }

        self.login("urn:john")

        # normal, add a tag
        body["tags"] = [tag_existing, tag_just_valid]
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = db.session.get(Collaboration, res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # tag too long
        body["tags"] = [tag_existing, tag_just_valid, tag_too_long]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = db.session.get(Collaboration, res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # normal, add a tag
        body["tags"] = [tag_existing, tag_just_valid, tag_digit_start]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = db.session.get(Collaboration, res["id"])
        self.assertEqual(3, len(collaboration.tags))

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
                      "description": "new_collaboration",
                      "administrators": ["the@ex.org", "that@ex.org"],
                      "short_name": "new_short_name"
                  }, with_basic_auth=False,
                  response_status_code=400)

    def test_collaboration_new_no_organisation_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == unihard_name).one().id
        self.login("urn:peter")
        self.post("/api/collaborations",
                  body={
                      "name": "new_collaboration",
                      "description": "new_collaboration",
                      "organisation_id": organisation_id
                  },
                  with_basic_auth=False,
                  response_status_code=403)

    def test_collaboration_update(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["name"] = "changed"
        collaboration["tags"] = ["tag_orphan", "new_tag_created"]
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

        collaboration = db.session.get(Collaboration, collaboration["id"])
        self.assertEqual(2, len(collaboration.tags))

    def test_collaboration_update_organisation(self):
        collaboration = self._find_by_identifier()
        pre_uuid4 = collaboration["uuid4"]

        organisation_id = self.find_entity_by_name(Organisation, unifra_name).id
        self.login()
        collaboration["units"] = []
        collaboration["organisation_id"] = organisation_id
        self.put("/api/collaborations", body=collaboration)

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual("ufra:ai_computing", collaboration.global_urn)
        self.assertListEqual(["ufra:ai_computing:ai_dev", "ufra:ai_computing:ai_res"],
                             sorted(group.global_urn for group in collaboration.groups))
        self.assertEqual(pre_uuid4, collaboration.uuid4)

    def test_collaboration_update_organisation_not_allowed(self):
        collaboration = self._find_by_identifier()
        organisation_id = self.find_entity_by_name(Organisation, unifra_name).id
        self.login("urn:admin")
        collaboration["units"] = []
        collaboration["organisation_id"] = organisation_id
        self.put("/api/collaborations", body=collaboration, response_status_code=403)

    def test_collaboration_update_orphan_tag(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.login("urn:john")
        collaboration = self.get(f"/api/collaborations/{collaboration.id}", with_basic_auth=False)
        collaboration["tags"] = []
        self.put("/api/collaborations", body=collaboration)
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(0, len(collaboration.tags))
        self.assertIsNone(Tag.query.filter(Tag.tag_value == "tag_uuc").first())

    def test_collaboration_update_short_name(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["short_name"] = "changed"
        collaboration["tags"] = [t["tag_value"] for t in collaboration["tags"]]
        self.put("/api/collaborations", body=collaboration)

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(1, len(collaboration.tags))
        for group in collaboration.groups:
            self.assertTrue("changed" in group.global_urn)

    def test_collaboration_update_short_name_not_allowd(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login("urn:admin")
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["short_name"] = "changed"
        self.put("/api/collaborations", body=collaboration)

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(co_ai_computing_short_name, collaboration.short_name)
        for group in collaboration.groups:
            self.assertFalse("changed" in group.global_urn)

    def test_collaboration_delete(self):
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        self.assertIsNotNone(tag)

        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.delete("/api/collaborations", primary_key=collaboration.id)

        self.assertIsNone(self.find_entity_by_name(Collaboration, co_ai_computing_name))
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").first()
        self.assertIsNone(tag)

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
        self.assertEqual(6, len(collaborations))

    def test_collaboration_all_optimized(self):
        collaborations = self.get("/api/collaborations/all_optimized")
        self.assertEqual(6, len(collaborations))

    def test_collaboration_mine_optimized(self):
        self.login("urn:peter")
        collaborations = self.get("/api/collaborations/mine_optimized", with_basic_auth=False)
        self.assertEqual(1, len(collaborations))

    def test_collaboration_by_id(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        self.assertEqual(collaboration_id, collaboration["id"])
        self.assertEqual(unihard_name, collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)
        self.assertEqual(1, len(collaboration["invitations"]))
        self.assertEqual(2, len(collaboration["services"]))

    def test_collaboration_by_id_v1(self):
        self.login()
        self.get("/api/collaborations/v1", with_basic_auth=False, response_status_code=405)

    def test_collaboration_by_id_service_connection_requests(self):
        collaboration_id = self.find_entity_by_name(Collaboration, co_research_name).id
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
        self.assertEqual(unihard_name, collaboration["organisation"]["name"])
        self.assertTrue(len(collaboration["collaboration_memberships"]) >= 4)

    def test_collaboration_name_exists(self):
        organisation_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).organisation_id
        other_organisation_id = self.find_entity_by_name(Collaboration, co_research_name).organisation_id

        res = self.get("/api/collaborations/name_exists", query_data={"name": co_ai_computing_name,
                                                                      "organisation_id": organisation_id})
        self.assertEqual(True, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": co_ai_computing_name,
                                                                      "organisation_id": other_organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists",
                       query_data={"name": co_ai_computing_name, "existing_collaboration": co_ai_computing_name.upper(),
                                   "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc",
                                                                      "organisation_id": organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/name_exists", query_data={"name": "xyc", "existing_collaboration": "xyc",
                                                                      "organisation_id": organisation_id})
        self.assertEqual(False, res)

    def test_collaboration_short_name_exists(self):
        organisation_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).organisation_id
        other_organisation_id = self.find_entity_by_name(Collaboration, co_research_name).organisation_id

        res = self.get("/api/collaborations/short_name_exists", query_data={"short_name": co_ai_computing_short_name,
                                                                            "organisation_id": organisation_id})
        self.assertEqual(True, res)

        res = self.get("/api/collaborations/short_name_exists", query_data={"short_name": co_ai_computing_short_name,
                                                                            "organisation_id": other_organisation_id})
        self.assertEqual(False, res)

        res = self.get("/api/collaborations/short_name_exists",
                       query_data={"short_name": co_ai_computing_name,
                                   "existing_collaboration": co_ai_computing_short_name.upper(),
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
        collaboration = self._find_by_identifier()
        collaboration_id = collaboration["id"]
        groups = [group["id"] for group in collaboration["groups"]]
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/collaborations/invites", body={
                "collaboration_id": collaboration_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join",
                "groups": groups,
                "membership_expiry_date": int(time.time()),
                "intended_role": "admin"
            })
            post_count = Invitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)
            invitation = Invitation.query.filter(Invitation.invitee_email == "new@example.org").first()
            self.assertEqual("admin", invitation.intended_role)
            self.assertEqual(2, len(invitation.groups))
            self.assertIsNotNone(invitation.membership_expiry_date)

    def test_collaboration_invites_no_intended_role(self):
        self.login("urn:john")
        collaboration_id = self._find_by_identifier()["id"]
        self.put("/api/collaborations/invites", body={
            "collaboration_id": collaboration_id,
            "administrators": ["new@example.org"],
            "intended_role": ""
        })
        invitation = Invitation.query.filter(Invitation.invitee_email == "new@example.org").first()
        self.assertEqual("member", invitation.intended_role)

    def test_collaboration_duplicate_invites(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        existing_invitee_mail = "curious@ex.org"
        res = self.put("/api/collaborations/invites",
                       body={"collaboration_id": collaboration_id, "administrators": [existing_invitee_mail],
                             "intended_role": "admin"}, response_status_code=400)
        self.assertTrue(existing_invitee_mail in res["message"])

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
        self.assertEqual(co_ai_computing_name, collaboration["name"])

    def test_collaboration_lite_by_id_disclose_no_group_memberships(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.disclose_email_information = False
        collaboration.disclose_member_information = False
        db.session.merge(collaboration)
        db.session.commit()

        self.login("urn:jane")
        collaboration = self.get(f"/api/collaborations/lite/{collaboration.id}")
        self.assertIsNone(collaboration["groups"][0]["collaboration_memberships"][0].get("user"))

    def test_collaboration_lite_no_member(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login("urn:roger")
        self.get(f"/api/collaborations/lite/{collaboration_id}", response_status_code=403)

    def test_collaboration_lite_not_existing_collaboration(self):
        self.login("urn:roger")
        self.get("/api/collaborations/lite/99999999999", response_status_code=403)

    def test_collaboration_lite_disclose_member_information(self):
        self.login("urn:sarah")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration["collaboration_memberships"]
        self.assertEqual(5, len(memberships))
        user = memberships[0]["user"]
        self.assertTrue("email" in user)

    def test_collaboration_lite_disclose_email_information(self):
        self.login("urn:roger")
        collaboration_id = self.find_entity_by_name(Collaboration, co_research_name).id
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
        collaboration_id = self.find_entity_by_name(Collaboration, co_teachers_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration.get("collaboration_memberships")
        self.assertFalse("user" in memberships[0])

    def test_api_call(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "administrator": "urn:sarah",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": read_image("robot.png"),
                                        "tags": ["label_1", "label_2", "1234567890123456789012345678901234"],
                                        "units": ["Research", "Support"]
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)
        collaboration_json = response.json
        self.assertEqual(2, len(collaboration_json["tags"]))
        self.assertEqual(1, len(collaboration_json["units"]))

        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        self.assertEqual(1, len(collaboration.collaboration_memberships))
        self.assertEqual("urn:sarah", collaboration.collaboration_memberships[0].user.uid)
        self.assertIsNone(collaboration.accepted_user_policy)
        self.assertIsNotNone(collaboration.logo)
        self.assertEqual(2, len(collaboration.tags))
        self.assertEqual(1, len(collaboration.units))

        one_day_ago = dt_now() - datetime.timedelta(days=1)
        self.assertTrue(collaboration.last_activity_date > one_day_ago)

        count = Invitation.query.filter(Invitation.collaboration_id == collaboration.id).count()
        self.assertEqual(2, count)

    def test_api_call_not_existing_unit(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unifra_secret}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "administrator": "urn:sarah",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": read_image("robot.png"),
                                        "units": ["Nope"]
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        error_message = response.json.get("message")
        self.assertTrue("Unit with name Nope" in error_message)
        self.assertTrue("does not exists" in error_message)

    def test_api_call_with_logo_prefix(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org"],
                                        "administrator": "urn:sarah",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": "data:image/WHATEVER;base64," + read_image("robot.png"),
                                        "tags": ["label_1", "label_2", "1234567890123456789012345678901234"],
                                        "units": ["Research", "Support"]
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)
        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        self.assertIsNotNone(collaboration.logo)

    def test_api_create_collaboration_generate_short_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "monitor1",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "administrator": "urn:sarah",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": read_image("uni-harderwijk-small.png"),
                                        "tags": ["label_1", "label_2", "!-INVALID"]
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)

        collaboration = self.find_entity_by_name(Collaboration, "monitor1")
        self.assertEqual("monitor12", collaboration.short_name)

    def test_api_call_invalid_logo(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "administrators": [],
                                        "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAk...."
                                    }),
                                    content_type="application/json")
        self.assertEqual("Invalid Logo: Incorrect padding", response.json["message"])

    def test_api_call_invalid_logo_bytes(self):
        logo = base64.encodebytes("Not a valid file".encode()).decode()
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "administrators": [],
                                        "logo": logo
                                    }),
                                    content_type="application/json")
        self.assertTrue("Invalid Logo" in response.json["message"])

    def test_api_call_invalid_json(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data="{{",
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)

    def test_api_call_without_logo(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)

        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        self.assertIsNotNone(collaboration.logo)

    def test_api_call_existing_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": co_ai_computing_name,
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertIn(
            f"Collaboration with name '{co_ai_computing_name}' already exists within organisation '{unihard_name}'.",
            data["message"])

    def test_api_call_existing_short_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org"],
                                        "short_name": f"{co_ai_computing_short_name}",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True

                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertIn(f"Collaboration with short_name '{co_ai_computing_short_name}' already exists within "
                      f"organisation '{unihard_name}'.", data["message"])

    def test_api_call_no_api(self):
        self.login("urn:john")
        response = self.client.post("/api/collaborations/v1",
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org"],
                                        "short_name": co_ai_computing_short_name
                                    }),
                                    content_type="application/json")
        self.assertEqual(403, response.status_code)
        data = response.json
        self.assertTrue("Not a valid external API call" in data["message"])

    def test_api_call_missing_required_attributes(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertTrue("Missing required attributes: ['name', 'description', "
                        "'disable_join_requests', 'disclose_member_information', "
                        "'disclose_email_information', 'administrators']" in data["message"])

    def test_api_call_with_invalid_short_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "!@#$%^&*(nope",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        response_json = response.json
        self.assertTrue("Invalid CO short_name" in response_json["message"])

    def test_api_call_with_invalid_short_name_2(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "lang56789012345678901234567890",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        response_json = response.json
        self.assertTrue("Invalid CO short_name" in response_json["message"])

    def test_api_call_with_invalid_short_name_3(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "12begincijfer",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        response_json = response.json
        self.assertTrue("Invalid CO short_name" in response_json["message"])

    def test_collaborations_may_request_collaboration_true(self):
        self.login("urn:mary")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertTrue(res)

    def test_collaborations_may_request_collaboration_false(self):
        self.login("urn:admin")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertFalse(res)

    def test_collaborations_may_request_collaboration_none(self):
        self.login("urn:jane")
        res = self.get("/api/collaborations/may_request_collaboration", with_basic_auth=False)
        self.assertFalse(res)

    def test_access_allowed_super_user(self):
        self.login("urn:john")
        data = self.get(
            f"/api/collaborations/access_allowed/{self.find_entity_by_name(Collaboration, co_ai_computing_name).id}")
        self.assertEqual("full", data["access"])

    def _access_allowed(self, urn, response_status_code=200):
        self.login(urn)
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        return self.get(f"/api/collaborations/access_allowed/{collaboration_id}",
                        response_status_code=response_status_code)

    def test_access_allowed_organisation_admin(self):
        data = self._access_allowed("urn:mary")
        # Mary is organisation admin
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
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.status = pre_status
        db.session.merge(collaboration)
        db.session.commit()

        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration.id}", with_basic_auth=False)
        collaboration["expiry_date"] = expiry_date
        collaboration["tags"] = [t["tag_value"] for t in collaboration["tags"]]
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
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        coll.last_activity_date = dt_now() - datetime.timedelta(days=365)
        coll.status = STATUS_SUSPENDED
        db.session.merge(coll)
        db.session.commit()

        self.put("/api/collaborations/unsuspend", body={"collaboration_id": coll.id})
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(STATUS_ACTIVE, coll.status)
        self.assertGreater(coll.last_activity_date, dt_now() - datetime.timedelta(hours=1))

    def test_activate(self):
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        coll.expiry_date = dt_now() - datetime.timedelta(days=365)
        coll.status = STATUS_EXPIRED
        db.session.merge(coll)
        db.session.commit()

        self.put("/api/collaborations/activate", body={"collaboration_id": coll.id})
        coll = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertEqual(STATUS_ACTIVE, coll.status)
        self.assertIsNone(coll.expiry_date)
        self.assertGreater(coll.last_activity_date, dt_now() - datetime.timedelta(hours=1))

    def test_id_by_identifier(self):
        res = self.get("/api/collaborations/id_by_identifier",
                       query_data={"identifier": co_ai_computing_uuid})
        self.assertIsNotNone(res["id"])

    def test_find_by_identifier_api(self):
        res = self.get(f"/api/collaborations/v1/{co_ai_computing_uuid}",
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        self.assertIsNotNone(res["groups"][0]["collaboration_memberships"][0]["user"]["email"])
        users = [cm.get("user") for cm in res.get("collaboration_memberships")]
        self.assertEqual(5, len(users))
        for user in users:
            self.assertFalse("mfa_reset_token" in user)
            self.assertTrue(isinstance(user.get("second_factor_auth"), bool))

        self.assertListEqual(res["tags"], ["tag_uuc"])

    def test_find_by_identifier_api_not_allowed(self):
        self.get(f"/api/collaborations/v1/{co_research_uuid}",
                          headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                          with_basic_auth=False, response_status_code=403)

    def test_find_by_identifier_api_not_exist(self):
        result = self.get("/api/collaborations/v1/invalid_uuid",
                          headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                          with_basic_auth=False, response_status_code=404)
        self.assertIn("The requested URL was not found", result["message"])

    def test_collaboration_new_with_expiry_date_past(self):
        try:
            self.app.app_config.feature.past_dates_allowed = False
            response = self.client.post("/api/collaborations/v1",
                                        headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                        data=json.dumps({
                                            "name": "new_collaboration",
                                            "description": "new_collaboration",
                                            "accepted_user_policy": "https://aup.org",
                                            "administrators": ["the@ex.org", "that@ex.org"],
                                            "short_name": "new_short_name",
                                            "disable_join_requests": True,
                                            "disclose_member_information": True,
                                            "disclose_email_information": True,
                                            "expiry_date": 999999999,
                                            "logo": read_image("test.png")
                                        }),
                                        content_type="application/json")
            self.assertEqual(400, response.status_code)
            self.assertTrue("in the past" in response.json["message"])
        finally:
            self.app.app_config.feature.past_dates_allowed = True

    def test_collaboration_admins(self):
        self.login("urn:service_admin")
        service = self.find_entity_by_name(Service, service_storage_name)
        res = self.get(f"/api/collaborations/admins/{service.id}")
        self.assertDictEqual({f"{co_research_name}": ["sarah@uni-franeker.nl"]}, res)

    def test_delete_membership_api(self):
        self.assertIsNotNone(self.find_collaboration_membership(co_ai_computing_uuid, 'urn:jane'))

        self.delete(f"/api/collaborations/v1/{co_ai_computing_uuid}/members/{'urn:jane'}",
                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                    with_basic_auth=False)

        self.assertIsNone(self.find_collaboration_membership(co_ai_computing_uuid, 'urn:jane'))

    def test_delete_membership_api_forbidden(self):
        self.delete(f"/api/collaborations/v1/{co_ai_computing_uuid}/members/{'urn:jane'}",
                    headers={"Authorization": f"Bearer {unifra_secret}"},
                    with_basic_auth=False,
                    response_status_code=403)

    def test_update_membership_api(self):
        membership = self.find_collaboration_membership(co_ai_computing_uuid, 'urn:jane')
        self.assertEqual("member", membership.role)

        self.put(f"/api/collaborations/v1/{co_ai_computing_uuid}/members",
                 headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                 body={"uid": "urn:jane", "role": "admin"},
                 with_basic_auth=False)

        membership = self.find_collaboration_membership(co_ai_computing_uuid, 'urn:jane')
        self.assertEqual("admin", membership.role)

    def test_update_membership_wrong_role_api(self):
        self.put(f"/api/collaborations/v1/{co_ai_computing_uuid}/members",
                 headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                 body={"uid": "urn:jane", "role": "nope"},
                 with_basic_auth=False,
                 response_status_code=400)

    def test_delete_collaboration_api(self):
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").one()
        self.assertIsNotNone(tag)

        self.delete(f"/api/collaborations/v1/{co_ai_computing_uuid}",
                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                    with_basic_auth=False)

        self.assertIsNone(self.find_entity_by_name(Collaboration, co_ai_computing_name))
        tag = Tag.query.filter(Tag.tag_value == "tag_uuc").first()
        self.assertIsNone(tag)

    def test_delete_collaboration_api_forbidden(self):
        self.delete(f"/api/collaborations/v1/{co_ai_computing_uuid}",
                    headers={"Authorization": f"Bearer {unifra_secret}"},
                    with_basic_auth=False,
                    response_status_code=403)

    def test_collaboration_with_units(self):
        organisation = Organisation.query.filter(Organisation.name == unihard_name).one()
        units = [{"name": unit.name, "id": unit.id, "label": unit.name} for unit in organisation.units]
        renamed_units = [{"name": "changed", "id": unit.id} for unit in organisation.units]
        new_units = [{"name": "nice", "id": 99999}]

        body = {
            "name": "new_collaboration",
            "description": "new_collaboration",
            "organisation_id": organisation.id,
            "administrators": [],
            "short_name": "short__",
            "current_user_admin": False
        }
        self.login("urn:john")

        # normal, add existing units
        body["units"] = units
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = db.session.get(Collaboration, res["id"])
        self.assertEqual(2, len(collaboration.units))

        # not allowed
        body["units"] = renamed_units
        body["name"] += "_"
        body["short_name"] += "_"
        self.post("/api/collaborations", body=body, with_basic_auth=False, response_status_code=400)

        body["units"] = new_units
        body["name"] += "_"
        body["short_name"] += "_"
        self.post("/api/collaborations", body=body, with_basic_auth=False, response_status_code=400)

        # CO admin can't change units
        co_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/{co_id}")
        self.login("urn:admin")
        collaboration["units"] = units
        res = self.put("/api/collaborations", body=collaboration, with_basic_auth=False)
        collaboration = db.session.get(Collaboration, res["id"])
        self.assertEqual(1, len(collaboration.units))

    def test_generate_short_name(self):
        short_name = generate_short_name(Collaboration, "monitor1")
        self.assertEqual("monitor12", short_name)

        short_name = generate_short_name(Collaboration, "Name !@#$ test qwerty long name")
        self.assertEqual("nametestqwertylo", short_name)

    def test_hint_short_name(self):
        res = self.post("/api/collaborations/hint_short_name", body={"name": "monitor1"}, response_status_code=200)
        self.assertEqual("monitor12", res["short_name"])

    def test_empty_hint_short_name(self):
        res = self.post("/api/collaborations/hint_short_name", body={"name": "*&^%$$@"}, response_status_code=200)
        self.assertEqual("short_name", res["short_name"])

    def test_api_call_invalid_emails(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["nope", "nada"],
                                        "administrator": "urn:sarah",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": read_image("robot.png")
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        response_json = response.json
        self.assertTrue("Invalid emails" in response_json["message"])

    def test_api_update_collaboration_units(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        self.assertEqual(0, len(collaboration.units))
        response = self.put(f"/api/collaborations/v1/{collaboration.identifier}/units",
                            headers={"Authorization": f"Bearer {unifra_secret}"},
                            body=[unifra_unit_cloud_name, unifra_unit_infra_name],
                            with_basic_auth=False)
        self.assertTrue("units" in response)
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        self.assertEqual(2, len(collaboration.units))

        self.put(f"/api/collaborations/v1/{collaboration.identifier}/units",
                 headers={"Authorization": f"Bearer {unifra_secret}"},
                 body=[],
                 with_basic_auth=False)
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        self.assertEqual(0, len(collaboration.units))

    def test_api_update_collaboration_units_forbidden(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.put(f"/api/collaborations/v1/{collaboration.identifier}/units",
                 headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                 body=[],
                 response_status_code=403,
                 with_basic_auth=False)
