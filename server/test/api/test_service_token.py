# -*- coding: future_fstrings -*-
from server.db.domain import ServiceToken, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name


class TestServiceToken(AbstractTest):

    def test_service_token_flow(self):
        pre_count = ServiceToken.query.count()
        secret = self.get("/api/service_tokens")["value"]

        service = self.find_entity_by_name(Service, service_network_name)

        self.login("urn:john")
        service_token = self.post("/api/service_tokens", body={"service_id": service.id, "hashed_token": secret},
                                  with_basic_auth=False)
        self.assertIsNotNone(service_token["id"])
        self.assertEqual(service.id, service_token["service_id"])
        self.assertIsNone(service_token.get("hashed_token"))

        post_count = ServiceToken.query.count()
        self.assertEqual(pre_count, post_count - 1)

        service = self.get(f"/api/services/{service.id}")
        self.assertEqual(2, len(service["service_tokens"]))

        self.delete("/api/service_tokens", primary_key=service_token["id"])
        post_count = ServiceToken.query.count()
        self.assertEqual(pre_count, post_count)

    def test_service_token_tampering(self):
        service = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:john")
        self.post("/api/service_tokens", body={"service_id": service.id, "hashed_token": "secret"},
                  with_basic_auth=False, response_status_code=403)
