# -*- coding: future_fstrings -*-
from sqlalchemy import text

from server.db.db import AuthorisationGroup, UserServiceProfile, Service, \
    db
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_authorisation, service_storage_name, \
    service_network_name, john_name


class TestAuthorisationGroupServices(AbstractTest):

    def test_add_authorisation_group_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_storage_name)

        # We need to link the services first to the collaboration otherwise the database complains
        self.put("/api/collaborations_services",
                 body={"collaboration_id": authorisation_group.collaboration_id,
                       "service_ids": [service.id]})

        count = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).count()
        self.assertEqual(0, count)

        self.login("urn:admin")
        self.put("/api/authorisation_group_services", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": authorisation_group.collaboration_id,
            "service_ids": [service.id]
        }, with_basic_auth=False)

        user_service_profiles = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).all()
        for user_service_profile in user_service_profiles:
            self.assertEqual(service.name, user_service_profile.service.name)

    def test_add_authorisation_group_service_json_validation(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)

        self.login("urn:admin")
        res = self.put("/api/authorisation_group_services", body={
            "authorisation_group_id": authorisation_group.id,
            "collaboration_id": authorisation_group.collaboration_id,
            "service_ids": ["(SELECT UpdateXML(null,@@version,null))"]
        }, with_basic_auth=False, response_status_code=400)
        self.assertTrue("(SELECT UpdateXML(null,@@version,null))' is not of type 'integer'" in res["message"])

    def test_add_authorisation_group_service_with_duplicate_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_network_name)
        self.put("/api/authorisation_group_services",
                 body={
                     "authorisation_group_id": authorisation_group.id,
                     "collaboration_id": authorisation_group.collaboration_id,
                     "service_ids": [service.id]
                 }, response_status_code=500)

    def test_delete_all_authorisation_group_service(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_network_name)

        count = UserServiceProfile.query.filter(UserServiceProfile.service_id == service.id).count()
        self.assertEqual(2, count)

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
        self.assertEqual(2, count)

        self.login("urn:admin")
        self.delete("/api/authorisation_group_services",
                    primary_key=f"{authorisation_group.id}/{service.id}/{authorisation_group.collaboration_id}")

        statement = f"SELECT COUNT(*) FROM user_service_profiles WHERE service_id = {service.id}"
        sql = text(statement)
        result_set = db.engine.execute(sql)
        res = next(iter(result_set))
        self.assertEqual(0, res[0])

    def test_pre_flight(self):
        authorisation_group = self.find_entity_by_name(AuthorisationGroup, ai_researchers_authorisation)
        service = self.find_entity_by_name(Service, service_network_name)

        user_service_profiles = self.get("/api/authorisation_group_services/delete_pre_flight",
                                         query_data={"authorisation_group_id": authorisation_group.id,
                                                     "service_id": service.id,
                                                     "collaboration_id": authorisation_group.collaboration_id})
        self.assertEqual(2, len(user_service_profiles))
        user_service_profile = self.find_by_name(user_service_profiles, john_name)
        self.assertEqual("urn:john", user_service_profile["user"]["uid"])
