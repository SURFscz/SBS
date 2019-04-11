from server.db.db import UserServiceProfile
from server.test.abstract_test import AbstractTest
from server.test.seed import john_name


class TestUserServiceProfile(AbstractTest):

    def test_attributes(self):
        res = self.get("/api/user_service_profiles/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://network"})

        self.assertListEqual(res["urn:mace:dir:attribute-def:postalAddress"], ["Postal 1234AA"])
        self.assertListEqual(res["urn:mace:dir:attribute-def:cn"], ["John Doe"])
        self.assertListEqual(sorted(res["urn:mace:dir:attribute-def:isMemberOf"]), ["AI computing", "ai_res"])
        self.assertListEqual(sorted(res["urn:mace:dir:attribute-def:mail"]), ["john@example.org", "john@org.com"])
        self.assertListEqual(res["urn:mace:dir:attribute-def:uid"], ["urn:john"])
        self.assertEqual(1, len(res["urn:oid:1.3.6.1.4.1.24552.1.1.1.13"]))

    def test_attributes_no_service(self):
        res = self.get("/api/user_service_profiles/attributes",
                       query_data={"uid": "urn:john", "service_entity_id": "https://nope"})
        self.assertDictEqual({}, res)

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

    def test_update_user_service_profile_ssh_key_conversion(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        user_service_profile_details = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        ssh2_pub = self.read_file("ssh2.pub")
        user_service_profile_details["ssh_key"] = ssh2_pub
        user_service_profile_details["convertSSHKey"] = True
        res = self.put(f"/api/user_service_profiles", body=user_service_profile_details)
        self.assertTrue(res["ssh_key"].startswith("ssh-rsa"))

    def test_update_user_service_profile_ssh_key_conversion_not_default(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        user_service_profile_details = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        ssh2_pub = self.read_file("ssh2.pub")
        user_service_profile_details["ssh_key"] = ssh2_pub
        res = self.put(f"/api/user_service_profiles", body=user_service_profile_details)
        self.assertTrue(res["ssh_key"].startswith("---- BEGIN SSH2 PUBLIC KEY ----"))

    def test_update_user_service_profile_forbidden(self):
        user_service_profile = self.find_entity_by_name(UserServiceProfile, john_name)
        self.login("urn:john")
        user_service_profile_details = self.get(f"/api/user_service_profiles/{user_service_profile.id}")
        self.login("urn:mary")
        self.put(f"/api/user_service_profiles", body=user_service_profile_details, response_status_code=403)
