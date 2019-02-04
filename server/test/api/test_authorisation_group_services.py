from sqlalchemy import text

from server.db.db import AuthorisationGroup, Collaboration, CollaborationMembership, User, UserServiceProfile, Service, \
    db
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, ai_computing_name, the_boss_name, service_storage_name, \
    service_network_name


class TestAuthorisationGroupServices(AbstractTest):

    def test_add_authorisation_group_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_storage_name)

        count = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).count()
        self.assertEqual(0, count)

        self.login("urn:admin")
        self.put("/api/authorisation_group_services", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": authorisation_group.collaboration_id,
            "service_ids": [service.id]
        }, with_basic_auth=False)

        user_service_profile = UserServiceProfile.query.filter(
            UserServiceProfile.service_id == service.id).one()
        self.assertEqual(service.name, user_service_profile.service.name)

    def test_delete_all_authorisation_group_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_network_name)

        count = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).count()
        self.assertEqual(1, count)

        self.login("urn:admin")
        self.delete("/api/authorisation_group_services/delete_all_services",
                    primary_key=f"{authorisation_group.id}/{authorisation_group.collaboration_id}")

        statement = f"SELECT COUNT(*) FROM user_service_profiles WHERE service_id = {service.id}"
        sql = text(statement)
        result_set = db.engine.execute(sql)
        res = next(iter(result_set))
        self.assertEqual(0, res[0])

    def test_delete_authorisation_group_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_network_name)

        count = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).count()
        self.assertEqual(1, count)

        self.login("urn:admin")
        self.delete("/api/authorisation_group_services",
                    primary_key=f"{authorisation_group.id}/{service.id}/{authorisation_group.collaboration_id}")

        statement = f"SELECT COUNT(*) FROM user_service_profiles WHERE service_id = {service.id}"
        sql = text(statement)
        result_set = db.engine.execute(sql)
        res = next(iter(result_set))
        self.assertEqual(0, res[0])
