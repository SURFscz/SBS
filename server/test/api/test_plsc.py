from base64 import b64encode

from server.db.domain import User
from server.db.models import flatten
from server.test.abstract_test import AbstractTest
from server.test.seed import user_sarah_name, service_wiki_entity_id, unihard_name, co_ai_computing_name, \
    group_ai_researchers, \
    user_boss_name, service_storage_entity_id

AUTH_HEADER_READ = {"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"}
AUTH_HEADER_IPADDRESS = {"Authorization": f"Basic {b64encode(b'ipaddress:secret').decode('ascii')}"}


class TestPlsc(AbstractTest):

    def test_sync_fetch(self):
        res = self.get("/api/plsc/sync")
        self.assert_sync_result(res)

    def test_syncing_fetch(self):
        res = self.get("/api/plsc/syncing")
        self.assert_sync_result(res)

    def test_suspended_user(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        sarah.suspended = True
        self.save_entity(sarah)

        res = self.get("/api/plsc/syncing")
        users = res["users"]
        suspended_user_names = sorted([user["name"] for user in users if user["status"] == "suspended"])
        self.assertListEqual([user_sarah_name, "user_deletion_warning", "user_gets_deleted"], suspended_user_names)
        self.assertEqual(15, len([user["name"] for user in users if user["status"] == "active"]))

    def test_sram_inactive_days(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        sarah.last_login_date = None
        self.save_entity(sarah)

        res = self.get("/api/plsc/syncing")
        users_ = res["users"]
        sarah = next(u for u in users_ if u["name"] == user_sarah_name)
        self.assertTrue(sarah["sram_inactive_days"] > (24 * 365))

    def assert_sync_result(self, res):
        self.assertEqual(4, len(res["organisations"]))
        logo = res["organisations"][0]["logo"]
        self.assertTrue(logo.startswith("http://localhost:8080/api/images/organisations/"))
        res_image = self.client.get(logo.replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        users_ = res["users"]
        self.assertEqual(18, len(users_))
        sarah = next(u for u in users_ if u["name"] == user_sarah_name)
        self.assertEqual("sarah@uni-franeker.nl", sarah["email"])
        self.assertEqual("sarah", sarah["username"])
        self.assertEqual("some-lame-key", sarah["ssh_keys"][0])
        self.assertEqual(1, sarah["sram_inactive_days"])
        boss = next(u for u in users_ if u["name"] == user_boss_name)
        self.assertEqual(2, len(boss["accepted_aups"]))
        user_gets_deleted = next(u for u in users_ if u["name"] == "user_gets_deleted")
        self.assertEqual(365, user_gets_deleted["sram_inactive_days"])
        services_ = res["services"]
        self.assertEqual(12, len(services_))
        wiki = next(s for s in services_ if s["entity_id"] == service_wiki_entity_id)
        self.assertEqual(wiki["contact_email"], "help@wiki.com")
        self.assertEqual(wiki["name"], "Wiki")
        self.assertTrue(wiki["logo"].startswith("http://localhost:8080/api/images/services/"))
        self.assertEqual(wiki["accepted_user_policy"], "https://google.nl")
        self.assertTrue(wiki["ldap_password"].startswith("$2b$12$"))
        self.assertIsNotNone(wiki["ldap_identifier"])
        self.assertIsNotNone(wiki["abbreviation"])
        res_image = self.client.get(wiki["logo"].replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        storage = next(s for s in services_ if s["entity_id"] == service_storage_entity_id)
        self.assertEqual(storage["contact_email"], "service_admin@ucc.org")
        collaborations = flatten([org["collaborations"] for org in res["organisations"] if org["name"] == unihard_name])
        ai_computing = [coll for coll in collaborations if coll["name"] == co_ai_computing_name][0]
        self.assertEqual("active", ai_computing["status"])
        self.assertEqual("active", ai_computing["collaboration_memberships"][0]["status"])
        self.assertEqual("https://www.google.nl", ai_computing["website_url"])
        self.assertEqual(f"http://localhost:3000/collaborations/{ai_computing['identifier']}",
                         ai_computing["sbs_url"])
        self.assertListEqual(sorted(["tag_uuc", "tag_uuc_2"]), sorted(ai_computing["tags"]))
        logo = ai_computing["logo"]
        self.assertTrue(logo.startswith("http://localhost:8080/api/images/collaborations/"))
        res_image = self.client.get(logo.replace("http://localhost:8080", ""))
        self.assertIsNotNone(res_image.data)
        groups = flatten([coll["groups"] for coll in collaborations if coll["name"] == co_ai_computing_name])
        ai_researchers = list(filter(lambda group: group["name"] == group_ai_researchers, groups))[0]
        self.assertIsNotNone(ai_researchers["description"])
        group_membership = ai_researchers["collaboration_memberships"][0]
        self.assertIsNotNone(group_membership["user_id"])

        org_harderwijk = [org for org in res["organisations"] if org["name"] == unihard_name][0]
        self.assertListEqual(["Research", "Support"], sorted(org_harderwijk["units"]))
        co_ai_computing = [co for co in org_harderwijk["collaborations"] if co["name"] == co_ai_computing_name][0]
        self.assertListEqual(["Support"], co_ai_computing["units"])
