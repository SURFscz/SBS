# -*- coding: future_fstrings -*-
from server.db.domain import Service, User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_cloud_name, james_name


class TestServiceMembership(AbstractTest):

    def test_delete_service_membership(self):
        self.login("urn:john")
        service = self.find_entity_by_name(Service, service_cloud_name)
        user = self.find_entity_by_name(User, james_name)

        self.assertEqual(1, len(service.service_memberships))

        self.login("urn:james")
        self.delete("/api/service_memberships", primary_key=f"{service.id}/{user.id}", )

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertEqual(0, len(service.service_memberships))

    def test_delete_service_membership_not_allowed(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        user = self.find_entity_by_name(User, james_name)

        self.login("urn:roger")
        self.delete("/api/service_memberships", primary_key=f"{service.id}/{user.id}", with_basic_auth=False,
                    response_status_code=403)
