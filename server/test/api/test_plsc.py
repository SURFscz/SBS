# -*- coding: future_fstrings -*-

from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, service_wiki_entity_id


class TestPlsc(AbstractTest):

    def test_fetch(self):
        res = self.get("/api/plsc/sync")
        self.assertEqual(2, len(res["organisations"]))

        users_ = res["users"]
        self.assertEqual(17, len(users_))
        sarah = next(u for u in users_ if u["name"] == sarah_name)
        self.assertEqual("sarah@uva.org", sarah["email"])
        self.assertEqual("sarah", sarah["username"])

        services_ = res["services"]
        self.assertEqual(8, len(services_))
        wiki = next(s for s in services_ if s["entity_id"] == service_wiki_entity_id)
        self.assertEqual(wiki["contact_email"], "help@wiki.com")
        self.assertEqual(wiki["name"], "Wiki")
