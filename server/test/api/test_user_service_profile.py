from server.test.abstract_test import AbstractTest


class TestUserServiceProfile(AbstractTest):

    def test_attributes(self):
        self.login()
        res = self.get("/api/user_service_profiles/attributes")
        self.assertListEqual(res, [
            {"name": "John Doe", "service_entity_id": "https://network"},
            {"email": "john@example.org", "global": True, "name": "John Doe", "uid": "urn:john"}
        ])
