from server.db.db import db
from server.db.domain import Organisation, CollaborationRequest, CollaborationMembership, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import schac_home_organisation_example, unifra_name, collaboration_request_name, unihard_name, \
    schac_home_organisation_unihar


class TestCollaborationRequest(AbstractTest):

    def test_collaboration_request_by_id(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        res = self.get(f"/api/collaboration_requests/{collaboration_request.id}")

        self.assertEqual("urn:peter", res["requester"]["uid"])
        self.assertEqual(unihard_name, res["organisation"]["name"])

    def test_request_collaboration(self):
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.login("urn:roger", schac_home_organisation_example)
        data = {
            "name": "New Collaboration",
            "short_name": "new_collaboration_short",
            "organisation_id": organisation.id
        }
        with self.app.mail.record_messages() as outbox:
            res = self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            collaboration_request = db.session.get(CollaborationRequest, res["id"])
            self.assertEqual("urn:roger", collaboration_request.requester.uid)
            mail_msg = outbox[0]
            self.assertEqual("Request for new collaboration New Collaboration (local)", mail_msg.subject)

    def test_request_collaboration_collaboration_creation_allowed(self):
        self.login("urn:roger", schac_home_organisation_unihar)
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        data = {
            "name": "New Collaboration",
            "description": "new_collaboration",
            "short_name": "new_COLLABORATION_short_but_still_to_long_for_not_getting_trimmed",
            "message": "pretty please",
            "organisation_id": organisation.id
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            collaboration = self.find_entity_by_name(Collaboration, data["name"])
            # Max length short_name
            self.assertEqual("new_collaboratio", collaboration.short_name)
            mail_msg = outbox[0]
            organisation = self.find_entity_by_name(Organisation, unihard_name)
            self.assertEqual(f"New collaboration {collaboration.name} created in {organisation.name} (local)",
                             mail_msg.subject)
            self.assertTrue("automatically approve collaboration requests" in mail_msg.html)

    def test_request_collaboration_collaboration_creation_allowed_entitlement(self):
        self.login("urn:harry",
                   schac_home_organisation_example,
                   {"eduperson_entitlement": ["urn:example:sbs:allow-create-co"]})
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        data = {
            "name": "New Collaboration",
            "description": "new_collaboration",
            "short_name": "NEW_COLLABORATION_SHORT",
            "message": "pretty please",
            "organisation_id": organisation.id
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            collaboration = self.find_entity_by_name(Collaboration, data["name"])

            self.assertEqual("new_collaboratio", collaboration.short_name)
            mail_msg = outbox[0]
            organisation = self.find_entity_by_name(Organisation, unifra_name)
            self.assertEqual(f"New collaboration {collaboration.name} created in {organisation.name} (local)",
                             mail_msg.subject)

    def test_request_collaboration_no_schachome(self):
        self.login("urn:user_suspend_warning", schac_home_organisation=None)
        self.post("/api/collaboration_requests", body={}, response_status_code=400, with_basic_auth=False)

    def test_request_collaboration_approve(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        collaboration_request_requester_uid = collaboration_request.requester.uid
        with self.app.mail.record_messages() as outbox:
            self.login("urn:mary")
            res = self.put(f"/api/collaboration_requests/approve/{collaboration_request.id}",
                           body={
                               "name": collaboration_request.name,
                               "description": "new_collaboration",
                               "short_name": collaboration_request.short_name,
                               "organisation_id": collaboration_request.organisation_id
                           }, with_basic_auth=False)

            members = CollaborationMembership.query.filter(CollaborationMembership.collaboration_id == res["id"]).all()
            self.assertEqual(1, len(members))

            membership = members[0]
            self.assertEqual("admin", membership.role)
            self.assertEqual(collaboration_request_requester_uid, membership.user.uid)

            mail_msg = outbox[0]
            self.assertEqual("Collaboration request for collaboration New Collaboration has been accepted (local)",
                             mail_msg.subject)

    def test_request_collaboration_approve_logo_url(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        collaboration_request_id = collaboration_request.id
        res = self.get(f"/api/collaboration_requests/{collaboration_request_id}")

        self.login("urn:john")
        self.put(f"/api/collaboration_requests/approve/{collaboration_request_id}",
                 body={
                     "name": res["name"],
                     "logo": res["logo"],
                     "description": "new_collaboration",
                     "short_name": res["short_name"],
                     "organisation_id": res["organisation_id"]
                 }, with_basic_auth=False)
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        raw_logo = collaboration_request.raw_logo()
        self.assertFalse(raw_logo.startswith("http"))

    def test_request_collaboration_deny(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)

        with self.app.mail.record_messages() as outbox:
            self.login("urn:mary")
            reason = "Prerogative of admins"
            self.put(f"/api/collaboration_requests/deny/{collaboration_request.id}",
                     body={"rejection_reason": reason},
                     with_basic_auth=False)

            mail_msg = outbox[0]
            self.assertEqual("Collaboration request for collaboration New Collaboration has been declined (local)",
                             mail_msg.subject)
            self.assertTrue(reason in mail_msg.html)

    def test_delete(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        self.login("urn:john")
        self.delete("/api/collaboration_requests", primary_key=collaboration_request.id, with_basic_auth=False,
                    response_status_code=400)

    def test_delete_with_status_open(self):
        pre_count = CollaborationRequest.query.count()
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        collaboration_request_id = collaboration_request.id
        self.login("urn:john")
        self.put(f"/api/collaboration_requests/approve/{collaboration_request_id}",
                 body={
                     "name": collaboration_request.name,
                     "description": "new_collaboration",
                     "short_name": collaboration_request.short_name,
                     "organisation_id": collaboration_request.organisation_id
                 }, with_basic_auth=False)
        self.delete("/api/collaboration_requests", primary_key=collaboration_request_id, with_basic_auth=False)
        self.assertEqual(pre_count - 1, CollaborationRequest.query.count())

    def test_request_collaboration_limited_recipients(self):
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        organisation.collaboration_creation_allowed = False
        self.save_entity(organisation)
        self.login("urn:james", schac_home_organisation_unihar)
        data = {
            "name": "New Collaboration",
            "short_name": "new_collaboration_short",
            "message": "pretty please",
            "organisation_id": organisation.id
        }
        with self.app.mail.record_messages() as outbox:
            self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
            mail_msg = outbox[0]
            # harry is not a recipient because he has a unit
            self.assertEqual(["john@example.org", "mary@example.org"], sorted(mail_msg.to))

    def test_collaboration_request_approve_not_allowed(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        self.login("urn:harry")
        self.put(f"/api/collaboration_requests/approve/{collaboration_request.id}",
                 body={}, with_basic_auth=False, response_status_code=403)

    def test_collaboration_request_by_id_not_allowed(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        collaboration_request_id = collaboration_request.id
        self.login("urn:harry")
        self.get(f"/api/collaboration_requests/{collaboration_request_id}",
                 with_basic_auth=False, response_status_code=403)

    def test_delete_not_allowed(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        self.login("urn:harry")
        self.delete("/api/collaboration_requests", primary_key=collaboration_request.id, with_basic_auth=False,
                    response_status_code=403)

    def test_request_collaboration_with_subdomain(self):
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.login("urn:mary")
        data = {
            "name": "New Collaboration",
            "short_name": "new_collaboration_short",
            "message": "pretty please",
            "organisation_id": organisation.id
        }
        res = self.post("/api/collaboration_requests", body=data, with_basic_auth=False)
        collaboration_request = db.session.get(CollaborationRequest, res["id"])
        self.assertEqual("urn:mary", collaboration_request.requester.uid)
