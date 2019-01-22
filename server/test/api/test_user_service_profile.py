from server.test.abstract_test import AbstractTest


class TestUserServiceProfile(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/user_service_profiles/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})
        self.assertEqual(2, len(res))
        self.assertEqual(res[0]["name"], "John Doe")
