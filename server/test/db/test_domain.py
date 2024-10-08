from sqlalchemy.exc import IntegrityError

from server.db.db import db
from server.db.domain import Collaboration, CollaborationMembership, Invitation, OrganisationInvitation, User, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import co_ai_computing_name, user_boss_name, service_cloud_name


class TestModels(AbstractTest):

    def test_collaboration(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        self.assertFalse(collaboration.is_admin(999))

        admin = self.find_entity_by_name(User, user_boss_name)
        self.assertTrue(collaboration.is_admin(admin.id))

    def test_invitation_role(self):
        Invitation.validate_role("admin")
        Invitation.validate_role("member")

        def invalid_role():
            Invitation.validate_role("nope")

        self.assertRaises(ValueError, invalid_role)

    def test_organisation_invitation_role(self):
        OrganisationInvitation.validate_role("admin")
        OrganisationInvitation.validate_role("manager")

        def invalid_role():
            OrganisationInvitation.validate_role("nope")

        self.assertRaises(ValueError, invalid_role)

    def test_prevent_duplicate_collaboration_membership(self):
        def duplicate_member_raises_error():
            existing_membership = CollaborationMembership.query.first()
            self.assertTrue(existing_membership.collaboration.is_member(existing_membership.user_id))
            duplicate = CollaborationMembership(
                user_id=existing_membership.user_id,
                collaboration_id=existing_membership.collaboration_id,
                role="admin",
                created_by=existing_membership.created_by,
                updated_by=existing_membership.updated_by,
            )
            db.session.merge(duplicate)
            db.session.commit()

        self.assertRaises(IntegrityError, duplicate_member_raises_error)

    def test_service(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.access_allowed_by_crm_organisation(User()))
        user = User.query.filter(User.uid == "urn:james").one()
        crm_organisation_id = service.crm_organisation_id
        service.crm_organisation_id = None
        self.assertFalse(service.access_allowed_by_crm_organisation(user))
        service.access_allowed_for_crm_organisation = False
        service.crm_organisation_id = crm_organisation_id
        self.assertFalse(service.access_allowed_by_crm_organisation(user))

        service.access_allowed_for_crm_organisation = True
        self.assertTrue(service.access_allowed_by_crm_organisation(user))
