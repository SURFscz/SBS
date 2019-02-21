from server.db.db import UserServiceProfile
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name


class TestUserServiceProfile(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/user_service_profiles/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})
        self.assertListEqual(res["address"], ["Postal 1234AA"])
        self.assertListEqual(res["cn"], ["John Doe"])
        self.assertListEqual(sorted(res["isMemberOf"]), ["AI computing", "ai_res"])
        self.assertListEqual(sorted(res["mail"]), ["john@example.org", "john@org.com"])
        self.assertListEqual(res["uid"], ["urn:john"])

    def test_user_service_profile_by_id(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        res = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        self.assertIsNotNone(res["ssh_key"])

    def test_my_user_service_profiles(self):
        self.login("urn:john")
        res = self.get("/api/user_service_profiles")
        self.assertEqual(1, len(res))

    def test_update_user_service_profile(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        user_service_profile_details = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        user_service_profile_details["telephone_number"] = "changed"
        res = self.put(f"/api/user_service_profiles", body=user_service_profile_details)
        self.assertEqual("changed", res["telephone_number"])

    def test_update_user_service_profile_forbidden(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        user_service_profile_details = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        self.login("urn:mary")
        self.put(f"/api/user_service_profiles", body=user_service_profile_details, response_status_code=403)
