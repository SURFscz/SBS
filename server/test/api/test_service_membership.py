from server.db.domain import Service, User, ServiceMembership
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

    def test_create_service_membership(self):
        self.login("urn:john")
        service = self.find_entity_by_name(Service, service_cloud_name)
        service_id = service.id
        self.post("/api/service_memberships",
                  body={"serviceId": service_id},
                  with_basic_auth=False)

        service_membership = ServiceMembership \
            .query \
            .join(ServiceMembership.user) \
            .filter(User.uid == "urn:john") \
            .filter(ServiceMembership.service_id == service_id) \
            .one()
        self.assertEqual("admin", service_membership.role)
