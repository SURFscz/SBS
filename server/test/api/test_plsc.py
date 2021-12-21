# -*- coding: future_fstrings -*-
from server.db.models import flatten
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, service_wiki_entity_id, uuc_name, ai_computing_name, ai_researchers_group, \
    the_boss_name, service_storage_entity_id


class TestPlsc(AbstractTest):

    def test_fetch(self):
        res = self.get("/api/plsc/sync")
        self.assertEqual(3, len(res["organisations"]))
        logo = res["organisations"][0]["logo"]
        self.assertTrue(logo.startswith("http://127.0.0.1:8080/api/images/organisations/"))

        res_image = self.client.get(logo.replace("http://127.0.0.1:8080", ""))
        self.assertIsNotNone(res_image.data)

        users_ = res["users"]
        self.assertEqual(18, len(users_))
        sarah = next(u for u in users_ if u["name"] == sarah_name)
        self.assertEqual("sarah@uva.org", sarah["email"])
        self.assertEqual("sarah", sarah["username"])
        self.assertEqual("some-lame-key", sarah["ssh_keys"][0])
        # Edge case due to the seed data - just ensure it does not break
        self.assertEqual("None", sarah["last_login_date"])

        boss = next(u for u in users_ if u["name"] == the_boss_name)
        self.assertEqual(2, len(boss["accepted_aups"]))

        to_be_deleted = next(u for u in users_ if u["name"] == "to_be_deleted")
        self.assertIsNotNone(to_be_deleted["last_login_date"])

        services_ = res["services"]
        self.assertEqual(8, len(services_))
        wiki = next(s for s in services_ if s["entity_id"] == service_wiki_entity_id)
        self.assertEqual(wiki["contact_email"], "help@wiki.com")
        self.assertEqual(wiki["name"], "Wiki")
        self.assertTrue(wiki["logo"].startswith("http://127.0.0.1:8080/api/images/services/"))
        self.assertEqual(wiki["accepted_user_policy"], "https://google.nl")
        self.assertTrue(wiki["ldap_password"].startswith("$6$rounds=100000$bFyBZD0Fim7BCAqt$BS"))

        res_image = self.client.get(wiki["logo"].replace("http://127.0.0.1:8080", ""))
        self.assertIsNotNone(res_image.data)

        storage = next(s for s in services_ if s["entity_id"] == service_storage_entity_id)
        self.assertEqual(storage["contact_email"], "service_admin@ucc.org")

        collaborations = flatten([org["collaborations"] for org in res["organisations"] if org["name"] == uuc_name])
        self.assertEqual("active", collaborations[0]["status"])
        self.assertEqual("active", collaborations[0]["collaboration_memberships"][0]["status"])

        self.assertEqual("https://www.google.nl", collaborations[0]["website_url"])

        logo = collaborations[0]["logo"]
        self.assertTrue(logo.startswith("http://127.0.0.1:8080/api/images/collaborations/"))
        res_image = self.client.get(logo.replace("http://127.0.0.1:8080", ""))
        self.assertIsNotNone(res_image.data)

        groups = flatten([coll["groups"] for coll in collaborations if coll["name"] == ai_computing_name])
        ai_researchers = list(filter(lambda group: group["name"] == ai_researchers_group, groups))[0]
        self.assertIsNotNone(ai_researchers["description"])

        group_membership = ai_researchers["collaboration_memberships"][0]
        self.assertIsNotNone(group_membership["user_id"])
