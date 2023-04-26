import datetime
import json
import time
import urllib

from sqlalchemy import text

from server.db.db import db
from server.db.defaults import STATUS_ACTIVE, STATUS_EXPIRED, STATUS_SUSPENDED
from server.db.domain import Collaboration, Organisation, Invitation, CollaborationMembership, User, Group, \
    ServiceGroup, Tag, Service
from server.db.models import flatten
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER
from server.test.seed import collaboration_ai_computing_uuid, ai_computing_name, uva_research_name, john_name, \
    ai_computing_short_name, uuc_teachers_name, read_image, collaboration_uva_researcher_uuid, service_group_wiki_name1, \
    service_storage_name, uva_secret
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
        self.assertEqual(collaboration["identifier"], collaboration_ai_computing_uuid)

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
                                          "description": "new_collaboration",
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

            count = self._collaboration_membership_count(collaboration)
            self.assertEqual(0, count)

    def test_collaboration_new_with_current_user_admin(self):
        wiki_service_group = self.find_entity_by_name(ServiceGroup, service_group_wiki_name1)
        wiki_service_group.auto_provision_members = True
        db.session.merge(wiki_service_group)
        db.session.commit()

        organisation = Organisation.query.filter(Organisation.name == uuc_name).one()
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

        organisation = Organisation.query.filter(Organisation.name == uuc_name).one()
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
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
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
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id

        value_just_valid = "just_valid-234567890123456789012"
        value_too_long = "invalid__--2345678901234567890123"
        value_invalid = "invalid__#"
        value_digit_start = "123_valid"
        value_weird_start = "_123_invalid"

        tag_existing = {'label': 'tag_uuc', 'value': Tag.query.filter(Tag.tag_value == "tag_uuc").one().id}
        tag_just_valid = {'label': value_just_valid, 'value': value_just_valid, '__isNew__': True}
        tag_too_long = {'label': value_too_long, 'value': value_too_long, '__isNew__': True}
        tag_invalid = {'label': value_invalid, 'value': value_invalid, '__isNew__': True}
        tag_digit_start = {'label': value_digit_start, 'value': value_digit_start, '__isNew__': True}
        tag_weird_start = {'label': value_weird_start, 'value': value_weird_start, '__isNew__': True}

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
        collaboration = Collaboration.query.get(res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # tag too long
        body["tags"] = [tag_existing, tag_just_valid, tag_too_long]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = Collaboration.query.get(res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # tag too long
        body["tags"] = [tag_existing, tag_just_valid, tag_invalid]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = Collaboration.query.get(res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # tag start with invalid char
        body["tags"] = [tag_existing, tag_just_valid, tag_weird_start]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = Collaboration.query.get(res["id"])
        self.assertEqual(2, len(collaboration.tags))

        # normal, add a tag
        body["tags"] = [tag_existing, tag_just_valid, tag_digit_start]
        body["name"] += "_"
        body["short_name"] += "_"
        res = self.post("/api/collaborations", body=body, with_basic_auth=False)
        collaboration = Collaboration.query.get(res["id"])
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
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
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
        collaboration["tags"] = [
            {'label': 'tag_orphan', 'value': Tag.query.filter(Tag.tag_value == "tag_orphan").one().id},
            {'label': 'new_tag_created', 'value': 'new_tag_created', '__isNew__': True}
        ]
        collaboration = self.put("/api/collaborations", body=collaboration)
        self.assertEqual("changed", collaboration["name"])

        collaboration = Collaboration.query.get(collaboration["id"])
        self.assertEqual(2, len(collaboration.tags))

    def test_collaboration_update_orphan_tag(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.login("urn:john")
        collaboration = self.get(f"/api/collaborations/{collaboration.id}", with_basic_auth=False)
        collaboration["tags"] = []
        self.put("/api/collaborations", body=collaboration)
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(0, len(collaboration.tags))
        self.assertIsNone(Tag.query.filter(Tag.tag_value == "tag_uuc").first())

    def test_collaboration_update_with_logo(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["name"] = "changed"
        collaboration["logo"] = "https://bogus"
        self.put("/api/collaborations", body=collaboration)

        rows = db.session.execute(text(f"SELECT logo FROM collaborations WHERE id = {collaboration_id}"))
        self.assertEqual(1, rows.rowcount)
        for row in rows:
            self.assertFalse(row[0].startswith("http"))

    def test_collaboration_update_short_name(self):
        collaboration_id = self._find_by_identifier()["id"]
        self.login()
        collaboration = self.get(f"/api/collaborations/{collaboration_id}", with_basic_auth=False)
        collaboration["short_name"] = "changed"
        self.put("/api/collaborations", body=collaboration)

        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(1, len(collaboration.tags))
        for group in collaboration.groups:
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
        self.assertEqual(1, len(collaboration["invitations"]))
        self.assertEqual(2, len(collaboration["services"]))

    def test_collaboration_by_id_v1(self):
        self.login()
        self.get("/api/collaborations/v1", with_basic_auth=False, response_status_code=405)

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

    def test_collaboration_lite_by_id_disclose_no_group_memberships(self):
        collaboration = self.find_entity_by_name(Collaboration, ai_computing_name)
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
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        collaboration = self.get(f"/api/collaborations/lite/{collaboration_id}")

        memberships = collaboration["collaboration_memberships"]
        self.assertEqual(5, len(memberships))
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
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "administrator": "urn:sarah",
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": read_image("uuc.jpeg"),
                                        "tags": ["label_1", "label_2", "!-INVALID"]
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)

        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        self.assertEqual(1, len(collaboration.collaboration_memberships))
        self.assertEqual("urn:sarah", collaboration.collaboration_memberships[0].user.uid)
        self.assertIsNone(collaboration.accepted_user_policy)
        self.assertIsNotNone(collaboration.logo)
        self.assertEqual(2, len(collaboration.tags))
        one_day_ago = datetime.datetime.now() - datetime.timedelta(days=1)
        self.assertTrue(collaboration.last_activity_date > one_day_ago)

        count = Invitation.query.filter(Invitation.collaboration_id == collaboration.id).count()
        self.assertEqual(2, count)

    def test_api_call_invalid_logo(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
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
        self.assertEqual(201, response.status_code)

        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        logo = collaboration.logo
        self.assertIsNotNone(logo)
        # The logo we send is invalid, but the fallback is the organisation logo
        self.get(logo, with_basic_auth=False, response_status_code=200)

    def test_api_call_invalid_json(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data="{{",
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)

    def test_api_call_with_logo_url(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "description": "new_collaboration",
                                        "administrators": ["the@ex.org", "that@ex.org"],
                                        "short_name": "new_short_name",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True,
                                        "logo": "https://static.surfconext.nl/media/idp/eduid.png"
                                    }),
                                    content_type="application/json")
        self.assertEqual(201, response.status_code)

        collaboration = self.find_entity_by_name(Collaboration, "new_collaboration")
        raw_logo = collaboration.raw_logo()
        urllib.request.urlopen("https://static.surfconext.nl/media/idp/eduid.png")
        self.assertFalse(raw_logo.startswith("http"))

    def test_api_call_without_logo(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
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
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": ai_computing_name,
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
        self.assertTrue(
            "Collaboration with name 'AI computing' already exists within organisation 'UUC'." in data["message"])

    def test_api_call_existing_short_name(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                        "name": "new_collaboration",
                                        "administrators": ["the@ex.org"],
                                        "short_name": f"1{ai_computing_short_name}",
                                        "description": "new_collaboration",
                                        "accepted_user_policy": "https://aup.org",
                                        "disable_join_requests": True,
                                        "disclose_member_information": True,
                                        "disclose_email_information": True

                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertTrue(
            "Collaboration with short_name 'ai_computing' already exists within organisation 'UUC'." in data["message"])

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
        self.assertTrue("Not a valid external API call" in data["message"])

    def test_api_call_missing_required_attributes(self):
        response = self.client.post("/api/collaborations/v1",
                                    headers={"Authorization": f"Bearer {uuc_secret}"},
                                    data=json.dumps({
                                    }),
                                    content_type="application/json")
        self.assertEqual(400, response.status_code)
        data = response.json
        self.assertTrue("Missing required attributes: ['name', 'description', 'short_name', "
                        "'disable_join_requests', 'disclose_member_information', "
                        "'disclose_email_information', 'administrators']" in data["message"])

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

    def test_activate(self):
        coll = self.find_entity_by_name(Collaboration, ai_computing_name)
        coll.expiry_date = datetime.datetime.now() - datetime.timedelta(days=365)
        coll.status = STATUS_EXPIRED
        db.session.merge(coll)
        db.session.commit()

        self.put("/api/collaborations/activate", body={"collaboration_id": coll.id})
        coll = self.find_entity_by_name(Collaboration, ai_computing_name)
        self.assertEqual(STATUS_ACTIVE, coll.status)
        self.assertIsNone(coll.expiry_date)
        self.assertTrue(coll.last_activity_date > datetime.datetime.now() - datetime.timedelta(hours=1))

    def test_find_by_identifier_api(self):
        res = self.get(f"/api/collaborations/v1/{collaboration_ai_computing_uuid}",
                       headers={"Authorization": f"Bearer {uuc_secret}"},
                       with_basic_auth=False)
        self.assertIsNotNone(res["groups"][0]["collaboration_memberships"][0]["user"]["email"])
        self.assertEqual(res["tags"][0]["tag_value"], "tag_uuc")

    def test_find_by_identifier_api_not_allowed(self):
        self.get(f"/api/collaborations/v1/{collaboration_uva_researcher_uuid}",
                 headers={"Authorization": f"Bearer {uuc_secret}"},
                 with_basic_auth=False, response_status_code=403)

    def test_collaboration_new_with_expiry_date_past(self):
        try:
            self.app.app_config.feature.past_dates_allowed = False
            response = self.client.post("/api/collaborations/v1",
                                        headers={"Authorization": f"Bearer {uuc_secret}"},
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
                                            "logo": read_image("uuc.jpeg")
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
        self.assertDictEqual({"UVA UCC research": ["sarah@uva.org"]}, res)

    def test_delete_membership_api(self):
        self.assertIsNotNone(self.find_collaboration_membership(collaboration_ai_computing_uuid, 'urn:jane'))

        self.delete(f"/api/collaborations/v1/{collaboration_ai_computing_uuid}/members/{'urn:jane'}",
                    headers={"Authorization": f"Bearer {uuc_secret}"},
                    with_basic_auth=False)

        self.assertIsNone(self.find_collaboration_membership(collaboration_ai_computing_uuid, 'urn:jane'))

    def test_delete_membership_api_forbidden(self):
        self.delete(f"/api/collaborations/v1/{collaboration_ai_computing_uuid}/members/{'urn:jane'}",
                    headers={"Authorization": f"Bearer {uva_secret}"},
                    with_basic_auth=False,
                    response_status_code=403)

    def test_delete_collaboration_api(self):
        self.delete(f"/api/collaborations/v1/{collaboration_ai_computing_uuid}",
                    headers={"Authorization": f"Bearer {uuc_secret}"},
                    with_basic_auth=False)

        self.assertIsNone(self.find_entity_by_name(Collaboration, ai_computing_name))

    def test_delete_collaboration_api_forbidden(self):
        self.delete(f"/api/collaborations/v1/{collaboration_ai_computing_uuid}",
                    headers={"Authorization": f"Bearer {uva_secret}"},
                    with_basic_auth=False,
                    response_status_code=403)
