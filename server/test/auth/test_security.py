from flask import session, g as request_context
from werkzeug.exceptions import Forbidden

from server.auth.security import is_admin_user, is_application_admin, confirm_allow_impersonation, \
    confirm_write_access, \
    confirm_collaboration_admin, confirm_collaboration_member, confirm_organisation_admin, \
    confirm_collaboration_admin_or_authorisation_group_member, current_user_name
from server.db.db import CollaborationMembership, Collaboration, User, OrganisationMembership, Organisation, \
    AuthorisationGroup
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name, the_boss_name, uuc_name, ai_researchers_authorisation


class TestSecurity(AbstractTest):

    def test_is_admin(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": True}

            self.assertTrue(is_admin_user("urn:john"))
            self.assertTrue(is_application_admin())

            confirm_allow_impersonation()
            request_context.is_authorized_api_call = False
            confirm_write_access()

    def test_collaboration_admin(self):
        admin_collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.collaboration) \
            .join(CollaborationMembership.user) \
            .filter(Collaboration.name == ai_computing_name) \
            .filter(User.name == the_boss_name) \
            .one()
        self.assertEqual("admin", admin_collaboration_membership.role)
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False, "id": admin_collaboration_membership.user_id}
            request_context.is_authorized_api_call = False

            confirm_collaboration_admin(admin_collaboration_membership.collaboration_id)

    def test_collaboration_member(self):
        member_collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.collaboration) \
            .join(CollaborationMembership.user) \
            .filter(Collaboration.name == ai_computing_name) \
            .filter(User.uid == "urn:jane") \
            .one()
        self.assertEqual("member", member_collaboration_membership.role)

        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False, "id": member_collaboration_membership.user_id}
            request_context.is_authorized_api_call = False

            confirm_collaboration_member(member_collaboration_membership.collaboration_id)

    def test_organisation_admin(self):
        admin_organisation_membership = OrganisationMembership.query \
            .join(OrganisationMembership.organisation) \
            .join(OrganisationMembership.user) \
            .filter(Organisation.name == uuc_name) \
            .filter(User.uid == "urn:mary") \
            .one()
        self.assertEqual("admin", admin_organisation_membership.role)

        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False, "id": admin_organisation_membership.user_id}
            request_context.is_authorized_api_call = False

            confirm_organisation_admin(admin_organisation_membership.organisation_id)

    def test_confirm_collaboration_admin_or_authorisation_group_member(self):
        authorisation_group = AuthorisationGroup.query.filter(
            AuthorisationGroup.name == ai_researchers_authorisation).one()
        user_id = authorisation_group.collaboration_memberships[0].user_id
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False, "id": user_id}
            request_context.is_authorized_api_call = False

            confirm_collaboration_admin_or_authorisation_group_member(authorisation_group.collaboration_id,
                                                                      authorisation_group.id)

    def test_confirm_collaboration_admin_or_authorisation_group_member_as_admin(self):
        authorisation_group = AuthorisationGroup.query.filter(
            AuthorisationGroup.name == ai_researchers_authorisation).one()
        user_id = self.find_entity_by_name(User, the_boss_name).id
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False, "id": user_id}
            request_context.is_authorized_api_call = False

            confirm_collaboration_admin_or_authorisation_group_member(authorisation_group.collaboration_id,
                                                                      authorisation_group.id)

    def test_confirm_write_access_override(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": False}
            request_context.is_authorized_api_call = False

            confirm_write_access(True, override_func=lambda x: x)

    def test_impersonation(self):
        self.login("urn:john")
        user_id = self.find_entity_by_name(User, the_boss_name).id
        res = self.get("/api/users/refresh", with_basic_auth=False,
                       headers={"X-IMPERSONATE-ID": user_id,
                                "X-IMPERSONATE-UID": "some_uid",
                                "X-IMPERSONATE-NAME": "some_name"})
        self.assertEqual(the_boss_name, res["name"])

    def test_current_user_name(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": True, "name": "some_name"}

            self.assertEqual("some_name", current_user_name())

    def test_impersonation_forbidden(self):
        def do_test_impersonation_forbidden():
            with self.app.app_context():
                session["user"] = {"uid": "urn:nope", "admin": False}
            confirm_allow_impersonation()

        self.assertRaises(Forbidden, do_test_impersonation_forbidden)
