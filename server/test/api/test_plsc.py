from base64 import b64encode

from server.db.models import flatten
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, service_wiki_entity_id, uuc_name, ai_computing_name, ai_researchers_group, \
    the_boss_name, service_storage_entity_id

AUTH_HEADER_READ = {"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"}
AUTH_HEADER_IPADDRESS = {"Authorization": f"Basic {b64encode(b'ipaddress:secret').decode('ascii')}"}


class TestPlsc(AbstractTest):

    def test_sync_fetch(self):
        res = self.get("/api/plsc/sync")
        self.assert_sync_result(res)

    def test_syncing_fetch(self):
        res = self.get("/api/plsc/syncing")
        self.assert_sync_result(res)

    def assert_sync_result(self, res):
        self.assertEqual(3, len(res["organisations"]))
        logo = res["organisations"][0]["logo"]
        self.assertTrue(logo.startswith("http://localhost:8080/api/images/organisations/"))
        res_image = self.client.get(logo.replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        users_ = res["users"]
        self.assertEqual(17, len(users_))
        sarah = next(u for u in users_ if u["name"] == sarah_name)
        self.assertEqual("sarah@uva.org", sarah["email"])
        self.assertEqual("sarah", sarah["username"])
        self.assertEqual("some-lame-key", sarah["ssh_keys"][0])
        self.assertEqual(2, len(sarah["user_ip_networks"]))
        self.assertListEqual(["255.0.0.1/32", "255.0.0.9/24"],
                             sarah["user_ip_networks"])
        # Edge case due to the seed data - just ensure it does not break
        self.assertEqual("None", sarah["last_login_date"])
        boss = next(u for u in users_ if u["name"] == the_boss_name)
        self.assertEqual(2, len(boss["accepted_aups"]))
        user_gets_deleted = next(u for u in users_ if u["name"] == "user_gets_deleted")
        self.assertIsNotNone(user_gets_deleted["last_login_date"])
        services_ = res["services"]
        self.assertEqual(11, len(services_))
        wiki = next(s for s in services_ if s["entity_id"] == service_wiki_entity_id)
        self.assertEqual(wiki["contact_email"], "help@wiki.com")
        self.assertEqual(wiki["name"], "Wiki")
        self.assertTrue(wiki["logo"].startswith("http://localhost:8080/api/images/services/"))
        self.assertEqual(wiki["accepted_user_policy"], "https://google.nl")
        self.assertTrue(wiki["ldap_password"].startswith("$2b$12$"))
        res_image = self.client.get(wiki["logo"].replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        storage = next(s for s in services_ if s["entity_id"] == service_storage_entity_id)
        self.assertEqual(storage["contact_email"], "service_admin@ucc.org")
        collaborations = flatten([org["collaborations"] for org in res["organisations"] if org["name"] == uuc_name])
        ai_computing = [coll for coll in collaborations if coll["name"] == ai_computing_name][0]
        self.assertEqual("active", ai_computing["status"])
        self.assertEqual("active", ai_computing["collaboration_memberships"][0]["status"])
        self.assertEqual("https://www.google.nl", ai_computing["website_url"])
        self.assertListEqual(["tag_uuc"], ai_computing["tags"])
        logo = ai_computing["logo"]
        self.assertTrue(logo.startswith("http://localhost:8080/api/images/collaborations/"))
        res_image = self.client.get(logo.replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        groups = flatten([coll["groups"] for coll in collaborations if coll["name"] == ai_computing_name])
        ai_researchers = list(filter(lambda group: group["name"] == ai_researchers_group, groups))[0]
        self.assertIsNotNone(ai_researchers["description"])
        group_membership = ai_researchers["collaboration_memberships"][0]
        self.assertIsNotNone(group_membership["user_id"])

    def test_ip_ranges_fetch(self):
        res = self.get("/api/plsc/ip_ranges")
        self.assertTrue("service_ipranges" in res)
        self.assertEqual(3, len(res["service_ipranges"]))
        self.assertTrue("82.217.86.55/24" in res["service_ipranges"])
        self.assertTrue("2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128" in res["service_ipranges"])
        self.assertTrue("2001:1c02:2b2f:be01:1cf0:fd5a:a548:1a16/128" in res["service_ipranges"])

    def test_ip_ranges_api_auth(self):
        res = self.get("/api/plsc/ip_ranges", headers=AUTH_HEADER_READ, with_basic_auth=False,
                       response_status_code=403)
        self.assertTrue(res['error'] is True)

        res = self.get("/api/plsc/ip_ranges", headers=AUTH_HEADER_IPADDRESS, with_basic_auth=False)
        self.assertEqual(3, len(res["service_ipranges"]))
