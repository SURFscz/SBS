# -*- coding: future_fstrings -*-
from server.test.abstract_test import AbstractTest
from server.test.seed import wiki_service_connection_request_hash, sarah_name, uva_research_name


class TestServiceConnectionRequest(AbstractTest):

    def test_service_connection_request_by_hash(self):
        res = self.get(f"/api/service_connection_requests/find_by_hash/{wiki_service_connection_request_hash}")

        self.assertEqual(sarah_name, res["requester"]["name"])
        self.assertEqual(uva_research_name, res["collaboration"]["name"])
        self.assertEqual("Wiki", res["service"]["name"])
