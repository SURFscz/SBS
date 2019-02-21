from sqlalchemy import text
from sqlalchemy.exc import DatabaseError

from server.db.db import AuthorisationGroup, db, User, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, roger_name, service_cloud_name, james_name, \
    service_mail_name, service_network_name, sarah_name, ai_computing_name


class TestTriggers(AbstractTest):

    def test_collaboration_memberships_authorisation_groups_collaboration_id(self):
        try:
            authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
            collaboration_membership = self.find_entity_by_name(User, roger_name).collaboration_memberships[0]

            statement = f"insert into collaboration_memberships_authorisation_groups " \
                f"(collaboration_membership_id,authorisation_group_id) " \
                f"values ({collaboration_membership.id},{authorisation_group.id})"
            sql = text(statement)
            db.engine.execute(sql)
        except DatabaseError as err:
            self.assertEqual("The collaboration ID must be equal for collaboration_memberships_authorisation_groups",
                             err.orig.args[1])

    def test_services_authorisation_groups_collaboration(self):
        try:
            authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
            service = self.find_entity_by_name(Service, service_cloud_name)
            statement = f"insert into services_authorisation_groups " \
                f"(service_id, authorisation_group_id) " \
                f"values ({service.id},{authorisation_group.id})"
            sql = text(statement)
            db.engine.execute(sql)
        except DatabaseError as err:
            self.assertEqual("Service must be linked to collaboration",
                             err.orig.args[1])

    def test_user_service_profile_no_service_collaboration_rel(self):
        try:
            user = self.find_entity_by_name(User, james_name)
            service = self.find_entity_by_name(Service, service_cloud_name)
            authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

            statement = f"insert into user_service_profiles (user_id, service_id, authorisation_group_id, " \
                f"created_by, updated_by) VALUES ({user.id}, {service.id}, {authorisation_group.id}, " \
                f"'urn:admin', 'urn:admin');"
            sql = text(statement)
            db.engine.execute(sql)
        except DatabaseError as err:
            self.assertEqual("UserServiceProfile service is not linked to collaboration",
                             err.orig.args[1])

    def test_user_service_profile_no_authorisation_group_collaboration_rel(self):
        try:
            user = self.find_entity_by_name(User, james_name)
            service = self.find_entity_by_name(Service, service_mail_name)
            authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

            statement = f"insert into user_service_profiles (user_id, service_id, authorisation_group_id, " \
                f"created_by, updated_by) VALUES ({user.id}, {service.id}, {authorisation_group.id}, " \
                f"'urn:admin', 'urn:admin');"
            sql = text(statement)
            db.engine.execute(sql)
        except DatabaseError as err:
            self.assertEqual("UserServiceProfile authorisation_group is not linked to service",
                             err.orig.args[1])

    def test_user_service_profile_no_authorisation_group_collaboration_membership_rel(self):
        try:
            user = self.find_entity_by_name(User, james_name)
            service = self.find_entity_by_name(Service, service_network_name)
            authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

            statement = f"insert into user_service_profiles (user_id, service_id, authorisation_group_id, " \
                f"created_by, updated_by) VALUES ({user.id}, {service.id}, {authorisation_group.id}, " \
                f"'urn:admin', 'urn:admin');"
            sql = text(statement)
            db.engine.execute(sql)
        except DatabaseError as err:
            self.assertEqual("UserServiceProfile authorisation_group is not linked to collaboration__membership",
                             err.orig.args[1])

    def test_user_service_profile_happy_flow(self):
        user = self.find_entity_by_name(User, sarah_name)
        service = self.find_entity_by_name(Service, service_network_name)
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

        cm_id = list(filter(lambda cm: cm.collaboration.name == ai_computing_name, user.collaboration_memberships))[
            0].id

        statement = f"INSERT INTO collaboration_memberships_authorisation_groups " \
            f"(collaboration_membership_id, authorisation_group_id) VALUES ({cm_id},{authorisation_group.id})"
        sql = text(statement)
        db.engine.execute(sql)

        statement = f"insert into user_service_profiles (user_id, service_id, authorisation_group_id, " \
            f"created_by, updated_by) VALUES ({user.id}, {service.id}, {authorisation_group.id}, " \
            f"'urn:admin', 'urn:admin');"
        sql = text(statement)
        db.engine.execute(sql)
