from flask import session, g as request_context
from werkzeug.exceptions import Forbidden

from server.auth.security import is_admin_user, is_application_admin, confirm_allow_impersonation, \
    confirm_write_access, \
    confirm_collaboration_admin, confirm_collaboration_member, confirm_organisation_admin, current_user_name, \
    is_current_user_organisation_admin_or_manager, has_org_manager_unit_access, confirm_api_key_unit_access
from server.db.domain import CollaborationMembership, Collaboration, User, OrganisationMembership, Organisation, ApiKey, \
    Unit
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, user_boss_name, unihard_name, co_monitoring_name


class TestSecurity(AbstractTest):

    def test_is_admin(self):
        with self.app.app_context():
            session["user"] = {"uid": "urn:john", "admin": True}

            self.assertTrue(is_admin_user({"uid": "urn:john"}))
            self.assertTrue(is_application_admin())

            confirm_allow_impersonation()
            request_context.is_authorized_api_call = False
            confirm_write_access()

    def test_collaboration_admin(self):
        admin_collaboration_membership = CollaborationMembership.query \
            .join(CollaborationMembership.collaboration) \
            .join(CollaborationMembership.user) \
            .filter(Collaboration.name == co_ai_computing_name) \
            .filter(User.name == user_boss_name) \
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
            .filter(Collaboration.name == co_ai_computing_name) \
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
            .filter(Organisation.name == unihard_name) \
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
        user_id = self.find_entity_by_name(User, user_boss_name).id
        res = self.get("/api/users/refresh", with_basic_auth=False,
                       headers={"X-IMPERSONATE-ID": user_id,
                                "X-IMPERSONATE-UID": "some_uid",
                                "X-IMPERSONATE-NAME": "some_name"})
        self.assertEqual(user_boss_name, res["name"])

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
        ai_computing_name_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
        with self.app.app_context():
            session["user"] = {"uid": "urn:mary", "admin": False, "id": mary_id}
            self.assertTrue(is_current_user_organisation_admin_or_manager(ai_computing_name_id))

    def test_impersonation_forbidden_by_configuration(self):
        def do_test_impersonation_forbidden():
            with self.app.app_context():
                session["user"] = {"uid": "urn:nope", "admin": True}
                confirm_allow_impersonation()

        with self.app.app_context():
            session["user"] = {"uid": "urn:nope", "admin": True}
            self.app.app_config.feature.impersonation_allowed = False
            confirm_allow_impersonation(confirm_feature_impersonation_allowed=False)

        self.assertRaises(Forbidden, do_test_impersonation_forbidden)
        self.app.app_config.feature.impersonation_allowed = True

    def test_has_access_to_co_units(self):
        with self.app.app_context() as context:
            context.g.is_authorized_api_call = False
            paul = self.find_entity_by_name(User, "Paul Doe")
            collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)

            session["user"] = {"uid": "urn:paul", "id": paul.id, "admin": False}

            self.assertRaises(Forbidden, lambda: confirm_collaboration_admin(collaboration.id))

    def test_has_org_manager_unit_access(self):
        with self.app.app_context() as context:
            org_manager = self.find_entity_by_name(User, "Harry Doe")
            context.g.is_authorized_api_call = False
            session["user"] = {"uid": "urn:paul", "id": org_manager.id, "admin": False}

            collaboration = self.find_entity_by_name(Collaboration, co_monitoring_name)
            self.assertFalse(has_org_manager_unit_access(org_manager.id, collaboration))

            collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
            self.assertTrue(has_org_manager_unit_access(org_manager.id, collaboration))
            self.assertFalse(has_org_manager_unit_access(org_manager.id, collaboration, org_manager_allowed=False))

    def test_confirm_api_key_unit_access(self):
        self.assertRaises(Forbidden, lambda: confirm_api_key_unit_access(None, Collaboration()))
        self.assertRaises(Forbidden, lambda: confirm_api_key_unit_access(ApiKey(), None))
        api_key = ApiKey(organisation_id=2, organisation=Organisation(name="ORG1"))
        collaboration = Collaboration(organisation_id=1, organisation=Organisation(name="ORG2"))
        # The ApiKey must be for the same Organisation as the Organisation of the Collaboration
        self.assertRaises(Forbidden, lambda: confirm_api_key_unit_access(api_key, collaboration))

        api_key = ApiKey(organisation_id=1, organisation=Organisation(name="ORG2"))
        # An ApiKey without units is allowed to access any CO
        confirm_api_key_unit_access(ApiKey(), Collaboration())
        # For an ApiKey with a unit, it is not allowed to request information about a CO that does not have a unit
        unit1 = Unit(id=1, name="name1")
        api_key.units = [unit1]
        self.assertRaises(Forbidden, lambda: confirm_api_key_unit_access(api_key, collaboration))
        # An ApiKey must have all the units the CO has
        unit2 = Unit(id=2, name="name2")
        collaboration.units = [unit1, unit2]
        self.assertRaises(Forbidden, lambda: confirm_api_key_unit_access(api_key, collaboration))
        api_key.units.append(unit2)
        # The ApiKey has all the units of the Collaboration
        confirm_api_key_unit_access(api_key, collaboration)
