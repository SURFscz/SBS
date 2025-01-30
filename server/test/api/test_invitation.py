import datetime
import time
import uuid
from unittest import mock

import sqlalchemy

from server.db.db import db
from server.db.defaults import STATUS_OPEN
from server.db.domain import Invitation, CollaborationMembership, User, Collaboration, Organisation, ServiceAup, \
    JoinRequest
from server.test.abstract_test import AbstractTest
from server.test.seed import invitation_hash_no_way, co_ai_computing_name, invitation_hash_curious, \
    invitation_hash_ufra, \
    co_research_name, unihard_name, co_ai_computing_short_name, co_ai_computing_join_request_peter_hash, \
    co_ai_computing_uuid, group_ai_researchers_short_name, group_ai_dev_identifier, unihard_secret_unit_support
from server.tools import dt_now


class TestInvitation(AbstractTest):

    def test_find_by_hash(self):
        invitation = self.get("/api/invitations/find_by_hash",
                              query_data={"hash": invitation_hash_no_way})
        self.assertEqual(invitation_hash_no_way, invitation["hash"])
        self.assertTrue(len(invitation["collaboration"]["collaboration_memberships"]) > 0)

    def test_find_by_hash_expand(self):
        invitation_result = self.get("/api/invitations/find_by_hash",
                                     query_data={"hash": invitation_hash_no_way, "expand": True})
        invitation = invitation_result["invitation"]
        self.assertEqual(invitation_hash_no_way, invitation["hash"])
        self.assertTrue(len(invitation["collaboration"]["collaboration_memberships"]) > 0)
        self.assertEqual(4, len(invitation_result["service_emails"]))

    def test_accept(self):
        self.login("urn:james", user_info={"name": "urn:james"})
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual("admin", collaboration_membership.role)
        user_id = self.find_entity_by_name(User, "urn:james").id
        self.assertEqual(2, ServiceAup.query.filter(ServiceAup.user_id == user_id).count())

    def test_accept_failed(self):
        self.login("urn:james", user_info={"name": "urn:james"})
        with mock.patch.object(self.app.db.session, "merge",
                               side_effect=sqlalchemy.exc.DatabaseError("failed", None, Exception("failed"))):
            self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                     response_status_code=400)

    def test_collaboration_expired_invitation(self):
        self.expire_invitation(invitation_hash_curious)
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)
        self.assertEqual(0, Invitation.query.filter(Invitation.hash == invitation_hash_curious).count())

    def test_external_collaboration_expired_invitation(self):
        invitation = self._get_invitation_curious()
        invitation.expiry_date = dt_now() - datetime.timedelta(days=500)
        invitation.external_identifier = str(uuid.uuid4())
        db.session.merge(invitation)
        db.session.commit()

        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)
        invitation = self._get_invitation_curious()
        self.assertEqual("expired", invitation.status)

    def test_external_collaboration_accepted(self):
        invitation = self._get_invitation_curious()
        invitation.external_identifier = str(uuid.uuid4())
        db.session.merge(invitation)
        db.session.commit()

        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        invitation = self._get_invitation_curious()
        self.assertEqual("accepted", invitation.status)

    def test_accept_with_authorisation_group_invitations(self):
        self.login("urn:jane")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_ufra}, with_basic_auth=False)

        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .join(CollaborationMembership.collaboration) \
            .filter(User.uid == "urn:jane") \
            .filter(Collaboration.name == co_research_name) \
            .one()
        self.assertEqual("member", collaboration_membership.role)

    def test_accept_already_member(self):
        self.login("urn:jane")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)

    def test_accept_expired(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_no_way}, with_basic_auth=False,
                 response_status_code=409)

    def test_decline(self):
        self.login("urn:james")
        self.put("/api/invitations/decline", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        invitations = Invitation.query.filter(Invitation.hash == invitation_hash_curious).all()
        self.assertEqual(0, len(invitations))

    def test_delete(self):
        invitation_id = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one().id
        self.login("urn:admin")
        self.delete("/api/invitations", primary_key=invitation_id, with_basic_auth=False)
        invitations = Invitation.query.filter(Invitation.hash == invitation_hash_curious).all()
        self.assertEqual(0, len(invitations))

    def test_delete_not_found(self):
        self.delete("/api/invitations", primary_key="nope", response_status_code=404)

    def test_delete_forbidden(self):
        invitation_id = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one().id
        self.login("urn:jane")
        self.delete("/api/invitations", primary_key=invitation_id, with_basic_auth=False, response_status_code=403)

    def test_resend(self):
        invitation_id = Invitation.query.filter(Invitation.hash == invitation_hash_curious).one().id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/invitations/resend", body={"id": invitation_id})
            self.assertEqual(1, len(outbox))
            mail_msg = outbox[0]
            self.assertListEqual(["curious@ex.org"], mail_msg.to)
            self.assertTrue(self.app.app_config.base_url + "/invitations/accept/" in mail_msg.html)

    def test_resend_bulk(self):
        invitation_identifiers = []
        for invitation in Invitation.query.filter(Invitation.status == "open").all():
            invitation_identifiers.append({"id": invitation.id})
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/invitations/resend_bulk", body=invitation_identifiers)
            self.assertEqual(2, len(outbox))

    def test_resend_not_found(self):
        self.put("/api/invitations/resend", body={"id": "nope"}, response_status_code=404)

    def _delete_coll_memberships(self, collaboration_name):
        collaboration = self.find_entity_by_name(Collaboration, collaboration_name)
        collaboration.collaboration_memberships.clear()
        db.session.merge(collaboration)
        db.session.commit()

    def test_collaboration_invites_api_identifier(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = self.put("/api/invitations/v1/collaboration_invites",
                           body={
                               "collaboration_identifier": co_ai_computing_uuid,
                               "invites": ["q@demo.com"]
                           },
                           headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                           with_basic_auth=False)
            self.assertEqual(1, len(outbox))
            self.assertListEqual(["q@demo.com"], [inv["email"] for inv in res])

    def test_collaboration_invites_api_bad_request(self):
        res = self.put("/api/invitations/v1/collaboration_invites", body={"invites": ["q@demo.com"]},
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"}, response_status_code=400,
                       with_basic_auth=False)
        self.assertTrue("Exactly one of short_name and collaboration_identifier is required" in res["message"])

    def test_collaboration_invites_api_bad_request_2(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={"collaboration_identifier": co_ai_computing_uuid, "short_name": co_ai_computing_short_name,
                             "invites": ["q@demo.com"]},
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       response_status_code=400, with_basic_auth=False)
        self.assertTrue("Exactly one of short_name and collaboration_identifier is required" in res["message"])

    def test_collaboration_invites_api_duplicate_mails(self):
        mail = "curious@ex.org"
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "invites": [mail]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False, response_status_code=400)
        self.assertTrue(mail in res["message"])

    def test_collaboration_invites_api_invalid_invites(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "invites": "test@surf.nl"
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False, response_status_code=400)
        self.assertTrue("Invites must be an array" in res["message"])

    def test_collaboration_invites_api_invalid_emails(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "invites": ["nope"]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False, response_status_code=400)
        self.assertTrue("No valid email in invites" in res["message"])

    def _do_test_collaboration_invites_api(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = self.put("/api/invitations/v1/collaboration_invites",
                           body={
                               "short_name": co_ai_computing_short_name,
                               "invites": ["q@demo.com", "x@demo.com", "invalid_email"]
                           },
                           headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                           with_basic_auth=False)
            self.assertEqual(2, len(outbox))
            self.assertListEqual(["q@demo.com", "x@demo.com"], [inv["email"] for inv in res])

    def test_collaboration_invites_api(self):
        self._do_test_collaboration_invites_api()

    def test_collaboration_invites_api_org_admin(self):
        self._delete_coll_memberships(co_ai_computing_name)

        self._do_test_collaboration_invites_api()

    def test_collaboration_invites_api_super_user(self):
        self._delete_coll_memberships(co_ai_computing_name)
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        organisation.organisation_memberships.clear()
        db.session.merge(organisation)
        db.session.commit()

        self._do_test_collaboration_invites_api()

    def test_collaboration_invite_wrong_collaboration(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "collaboration_identifier": "123456",
                           "invites": ["q@demo.com", "x@demo.com", "invalid_email"]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       response_status_code=403,
                       with_basic_auth=False)
        self.assertIn(f"Collaboration 123456 is not part of organisation {unihard_name}", res["message"])

    @staticmethod
    def _get_invitation_curious():
        return Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()

    def test_external_invitation(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "intended_role": "bogus",
                           "invitation_expiry_date": (int(time.time()) * 1000) + 60 * 60 * 25 * 15,
                           "invites": ["joe@test.com"],
                           "sender_name": "Organisation XYZ",
                           "groups": [group_ai_researchers_short_name, group_ai_dev_identifier]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        invitation_id = res[0]["invitation_id"]
        res = self.get(f"/api/invitations/v1/{invitation_id}",
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        self.assertEqual("member", res["intended_role"])
        self.assertEqual("open", res["status"])
        self.assertEqual("joe@test.com", res["invitation"]["email"])
        self.assertEqual(2, len(res["groups"]))
        self.assertEqual(co_ai_computing_short_name, res["collaboration"]["short_name"])

        invitation = Invitation.query.filter(Invitation.external_identifier == invitation_id).first()
        self.assertEqual("member", invitation.intended_role)
        self.assertEqual("Organisation XYZ", invitation.sender_name)

        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation.hash}, with_basic_auth=False)

        # To avoid Instance <ApiKey> is not bound to a Session and the extenal API is stateless
        self.logout()
        res = self.get(f"/api/invitations/v1/{invitation_id}",
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        self.assertEqual("accepted", res["status"])

    def test_external_invitation_invalid_group(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "intended_role": "bogus",
                           "invitation_expiry_date": (int(time.time()) * 1000) + 60 * 60 * 25 * 15,
                           "invites": ["joe@test.com"],
                           "groups": ["nope"]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False,
                       response_status_code=400)
        self.assertTrue("Invalid group identifier: nope" in res["message"])

    def test_accept_with_existing_join_request(self):
        self.assertEqual(1,
                         JoinRequest.query.filter(JoinRequest.hash == co_ai_computing_join_request_peter_hash).count())
        self.login("urn:peter")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        self.assertEqual(0,
                         JoinRequest.query.filter(JoinRequest.hash == co_ai_computing_join_request_peter_hash).count())

    def test_open_invites_api(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        res = self.get(f"/api/invitations/v1/invitations/{collaboration.identifier}",
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        self.assertEqual(1, len(res))
        self.assertEqual(STATUS_OPEN, res[0]["status"])

    def test_delete_external_invitation(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": co_ai_computing_short_name,
                           "intended_role": "bogus",
                           "invitation_expiry_date": (int(time.time()) * 1000) + 60 * 60 * 25 * 15,
                           "invites": ["joe@test.com"],
                           "groups": [group_ai_researchers_short_name, group_ai_dev_identifier]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        invitation_id = res[0]["invitation_id"]
        invitation = Invitation.query.filter(Invitation.external_identifier == invitation_id).one()
        self.assertIsNotNone(invitation)
        self.assertEqual(unihard_name, invitation.sender_name)

        self.delete(f"/api/invitations/v1/{invitation_id}",
                    headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                    with_basic_auth=False)
        invitation = Invitation.query.filter(Invitation.external_identifier == invitation_id).first()
        self.assertIsNone(invitation)

    def test_invitation_exists_by_email(self):
        invitation = Invitation.query.filter(Invitation.invitee_email == "curious@ex.org").one()
        collaboration_id = invitation.collaboration_id
        res = self.post("/api/invitations/exists_email",
                        body={"emails": ["CURIOUS@ex.org"], "collaboration_id": collaboration_id},
                        response_status_code=200)
        self.assertEqual(["curious@ex.org"], res)
        res = self.post("/api/invitations/exists_email",
                        body={"emails": ["nope@ex.org"], "collaboration_id": collaboration_id},
                        response_status_code=200)
        self.assertEqual(0, len(res))

    def test_delete_by_hash(self):
        self.delete(f"/api/invitations/delete_by_hash/{invitation_hash_no_way}")
        self.get("/api/invitations/find_by_hash", query_data={"hash": invitation_hash_no_way},
                 response_status_code=404)

    def test_resend_api_invite(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "collaboration_identifier": co_ai_computing_uuid,
                           "invites": ["q@demo.com"]
                       },
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        external_identifier = res[0].get("invitation_id")
        self.expire_invitation_api(external_identifier)
        with self.app.mail.record_messages() as outbox:
            res = self.put(f"/api/invitations/v1/resend/{external_identifier}",
                           body={},
                           headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                           with_basic_auth=False)
            self.assertEqual(1, len(outbox))
            expiry_date = datetime.datetime.fromtimestamp(res["invitation"]["expiry_date"])
            diff = expiry_date - datetime.datetime.now()
            self.assertTrue(diff.days >= 14)
            self.assertTrue("Reminder: you have been invited by" in outbox[0].html)
