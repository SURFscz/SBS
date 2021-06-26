# -*- coding: future_fstrings -*-
from flask import session, g as request_context
from werkzeug.exceptions import Forbidden

from server.auth.security import is_admin_user, is_application_admin, confirm_allow_impersonation, \
    confirm_write_access, \
    confirm_collaboration_admin, confirm_collaboration_member, confirm_organisation_admin, current_user_name, \
    is_current_user_organisation_admin_or_manager
from server.db.domain import CollaborationMembership, Collaboration, User, OrganisationMembership, Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_computing_name, the_boss_name, uuc_name


class TestSecurity(AbstractTest):

    def test_is_admin(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": True, "confirmed_admin": True}

            self.assertTrue(is_admin_user({"uid": "urn:john"}))
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

    def test_is_current_user_organisation_admin(self):
        mary_id = self.find_entity_by_name(User, "Mary Doe").id
        ai_computing_name_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        with self.app.app_context():
            session["user"] = {"uid": "urn:mary", "admin": False, "id": mary_id}
            self.assertTrue(is_current_user_organisation_admin_or_manager(ai_computing_name_id))

    def test_is_application_admin_without_admin_users_upgrade(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:nope", "admin": True}
        self.app.app_config.feature.admin_users_upgrade = False
        self.assertEqual(True, is_application_admin())
        self.app.app_config.feature.admin_users_upgrade = True

    def test_impersonation_forbidden_with_admin_users_upgrade(self):
        def do_test_impersonation_forbidden():
            with self.app.app_context():
                session["user"] = {"uid": "urn:nope", "admin": True, "confirmed_admin": False}
            confirm_allow_impersonation()

        self.assertRaises(Forbidden, do_test_impersonation_forbidden)

    def test_impersonation_forbidden_by_configuration(self):
        def do_test_impersonation_forbidden():
            self.app.app_config.feature.impersonation_allowed = False
            confirm_allow_impersonation()

        self.assertRaises(Forbidden, do_test_impersonation_forbidden)
        self.app.app_config.feature.impersonation_allowed = True
