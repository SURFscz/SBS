from server.db.db import Service
from server.test.abstract_test import AbstractTest, BASIC_AUTH_HEADER
from server.test.seed import service_mail_name


class TestCollaborationsServices(AbstractTest):

    def _find_service_by_name(self, name=service_mail_name):
        service = Service.query.filter(Service.name == name).one()
        return self.get(f"api/services/{service.id}")

    def test_delete_collaborations_services(self):
        service_mail = self._find_service_by_name(service_mail_name)
        self.assertTrue(len(service_mail["collaborations"]) > 0)
        collaboration_id = service_mail["collaborations"][0]["id"]
        service_id = service_mail["id"]
        response = self.client.delete(f"api/collaborations_services/{collaboration_id}/{service_id}",
                                      headers=BASIC_AUTH_HEADER,
                                      content_type="application/json")
        self.assertEqual(204, response.status_code)
