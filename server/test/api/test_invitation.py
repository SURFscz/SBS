# -*- coding: future_fstrings -*-
import datetime
import uuid

from server.db.db import db
from server.db.domain import Invitation, CollaborationMembership, User, Collaboration, Organisation, ServiceAup
from server.test.abstract_test import AbstractTest
from server.test.seed import invitation_hash_no_way, ai_computing_name, invitation_hash_curious, invitation_hash_uva, \
    uva_research_name, uuc_secret, uuc_name, ai_computing_short_name


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
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .filter(User.uid == "urn:james") \
            .one()
        self.assertEqual("admin", collaboration_membership.role)
        user_id = self.find_entity_by_name(User, "urn:james").id
        self.assertEqual(4, ServiceAup.query.filter(ServiceAup.user_id == user_id).count())

    def test_collaboration_expired_invitation(self):
        self.expire_invitation(invitation_hash_curious)
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)
        self.assertEqual(0, Invitation.query.filter(Invitation.hash == invitation_hash_curious).count())

    def test_external_collaboration_expired_invitation(self):
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        invitation.expiry_date = datetime.datetime.utcnow() - datetime.timedelta(days=500)
        invitation.external_identifier = str(uuid.uuid4())
        db.session.merge(invitation)
        db.session.commit()

        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False,
                 response_status_code=409)
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        self.assertEqual("expired", invitation.status)

    def test_external_collaboration_accepted(self):
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        invitation.external_identifier = str(uuid.uuid4())
        db.session.merge(invitation)
        db.session.commit()

        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        self.assertEqual("accepted", invitation.status)

    def test_accept_with_authorisation_group_invitations(self):
        self.login("urn:jane")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_uva}, with_basic_auth=False)

        collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.user) \
            .join(CollaborationMembership.collaboration) \
            .filter(User.uid == "urn:jane") \
            .filter(Collaboration.name == uva_research_name) \
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
            self.assertListEqual(["curious@ex.org"], mail_msg.recipients)
            self.assertTrue("http://localhost:3000/invitations/accept/" in mail_msg.html)

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

    def _do_test_collaboration_invites_api(self):
        mail = self.app.mail
        with mail.record_messages() as outbox:
            res = self.put("/api/invitations/v1/collaboration_invites",
                           body={
                               "short_name": ai_computing_short_name,
                               "invites": ["q@demo.com", "x@demo.com", "invalid_email"]
                           },
                           headers={"Authorization": f"Bearer {uuc_secret}"},
                           with_basic_auth=False)
            self.assertEqual(2, len(outbox))
            self.assertListEqual(["q@demo.com", "x@demo.com"], [inv["email"] for inv in res])

    def test_collaboration_invites_api(self):
        self._do_test_collaboration_invites_api()

    def test_collaboration_invites_api_org_admin(self):
        self._delete_coll_memberships(ai_computing_name)

        self._do_test_collaboration_invites_api()

    def test_collaboration_invites_api_super_user(self):
        self._delete_coll_memberships(ai_computing_name)
        organisation = self.find_entity_by_name(Organisation, uuc_name)
        organisation.organisation_memberships.clear()
        db.session.merge(organisation)
        db.session.commit()

        self._do_test_collaboration_invites_api()

    def test_collaboration_invite_wrong_collaboration(self):
        res = self.put("/api/invitations/v1/collaboration_invites",
                       body={
                           "short_name": "nope",
                           "invites": ["q@demo.com", "x@demo.com", "invalid_email"]
                       },
                       headers={"Authorization": f"Bearer {uuc_secret}"},
                       response_status_code=403,
                       with_basic_auth=False)
        self.assertEqual("Collaboration nope is not part of organisation UUC", res["message"])

    def test_collaboration_external_identifier(self):
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        invitation.expiry_date = datetime.datetime.utcnow() - datetime.timedelta(days=500)
        invitation.external_identifier = str(uuid.uuid4())
        db.session.merge(invitation)
        db.session.commit()

        self.login("urn:james")
        self.put("/api/invitations/accept", headers={"Authorization": f"Bearer {uuc_secret}"}, with_basic_auth=False)
        invitation = Invitation.query.filter(Invitation.hash == invitation_hash_curious).first()
        self.assertEqual("expired", invitation.status)
