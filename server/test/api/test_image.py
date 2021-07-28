
# -*- coding: future_fstrings -*-
import re

from server.db.domain import Service, CollaborationRequest
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_scheduler_name, collaboration_request_name


class TestImage(AbstractTest):

    def test_find_image(self):
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        res = self.client.get(f"/api/images/services/{service.uuid4}")

        self.assertEqual("*", res.headers["Access-Control-Allow-Origin"])
        self.assertIsNotNone(res.data)

    def test_logo_url(self):
        collaborations = self.get("/api/collaborations/all")
        self.assertEqual(43, len(collaborations))
        pattern = re.compile(r"^http://localhost:8080/api/images/collaborations/([a-z0-9-]+)$")
        for coll in collaborations:
            self.assertTrue(pattern.match(coll["logo"]))

    def test_find_image_sql_injection(self):
        res = self.client.get("/api/images/evil/5")
        self.assertEqual(400, res.status_code)

    def test_collaboration_request(self):
        collaboration_request = self.find_entity_by_name(CollaborationRequest, collaboration_request_name)
        collaboration_request_id = collaboration_request.id
        self.login("urn:john")
        collaboration_request = self.get(f"/api/collaboration_requests/{collaboration_request_id}")
        self.assertEqual(collaboration_request["logo"],
                         f"http://localhost:8080/api/images/collaboration_requests/{collaboration_request['uuid4']}")
        res = self.client.get(f"/api/images/collaboration_requests/{collaboration_request['uuid4']}")
        self.assertIsNotNone(res.data)
