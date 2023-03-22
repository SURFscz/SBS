from server.db.defaults import SERVICE_TOKEN_SCIM, SERVICE_TOKEN_INTROSPECTION, SERVICE_TOKEN_PAM
from server.db.domain import ServiceToken, Service
from server.test.abstract_test import AbstractTest
from server.test.seed import service_network_name, service_mail_name


class TestServiceToken(AbstractTest):

    def test_service_token_flow(self):
        pre_count = ServiceToken.query.count()
        secret = self.get("/api/service_tokens")["value"]

        service = self.find_entity_by_name(Service, service_network_name)
        service_id = service.id

        self.login("urn:john")
        body = {"service_id": service.id, "hashed_token": secret, "description": "Test",
                "token_type": SERVICE_TOKEN_INTROSPECTION}
        service_token = self.post("/api/service_tokens", body=body,
                                  with_basic_auth=False)
        self.assertIsNotNone(service_token["id"])
        self.assertEqual(service_id, service_token["service_id"])
        self.assertIsNone(service_token.get("hashed_token"))

        post_count = ServiceToken.query.count()
        self.assertEqual(pre_count, post_count - 1)

        service = self.get(f"/api/services/{service_id}")
        self.assertEqual(3, len(service["service_tokens"]))

        self.delete("/api/service_tokens", primary_key=service_token["id"])
        post_count = ServiceToken.query.count()
        self.assertEqual(pre_count, post_count)

    def test_service_token_tampering(self):
        service = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:john")
        self.post("/api/service_tokens", body={"service_id": service.id, "hashed_token": "secret"},
                  with_basic_auth=False, response_status_code=403)

    def test_service_token_enable_tokens(self):
        secret = self.get("/api/service_tokens")["value"]

        service = self.find_entity_by_name(Service, service_mail_name)
        self.assertFalse(service.pam_web_sso_enabled)
        self.assertFalse(service.token_enabled)
        self.assertFalse(service.scim_client_enabled)

        self.login("urn:john")
        self.post("/api/service_tokens",
                  body={"service_id": service.id, "hashed_token": secret, "token_enabled": True,
                        "description": "Test", "pam_web_sso_enabled": True, "token_type": SERVICE_TOKEN_SCIM},
                  with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_mail_name)
        self.assertTrue(service.scim_client_enabled)
        self.assertEqual(1, len(service.service_tokens))

    def test_service_token_pam_allowed(self):
        secret = self.get("/api/service_tokens")["value"]
        self.login("urn:john")

        service = self.find_entity_by_name(Service, service_mail_name)
        self.assertFalse(service.pam_web_sso_enabled)

        self.post("/api/service_tokens",
                  body={"service_id": service.id, "hashed_token": secret, "token_enabled": True,
                        "description": "Test", "pam_web_sso_enabled": True, "token_type": SERVICE_TOKEN_PAM},
                  with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_mail_name)
        self.assertTrue(service.pam_web_sso_enabled)
        self.assertEquals(1, len(service.service_tokens))

    def test_service_token_wrong_token_type(self):
        secret = self.get("/api/service_tokens")["value"]
        self.login("urn:john")

        service = self.find_entity_by_name(Service, service_mail_name)
        self.post("/api/service_tokens",
                  body={"service_id": service.id, "hashed_token": secret, "token_enabled": True,
                        "description": "Test", "pam_web_sso_enabled": True, "token_type": "Nope"},
                  with_basic_auth=False, response_status_code=403)
