from server.test.abstract_test import AbstractTest


class TestUserServiceProfile(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/user_service_profiles/attributes", query_data={"uid": "urn:john"})
        self.assertListEqual(res, [
            {"name": "John Doe", "service_entity_id": "https://network"},
            {"email": "john@example.org", "global": True, "name": "John Doe", "uid": "urn:john"}
        ])
