import datetime

from server.auth.secrets import generate_token
from server.db.domain import Service, User, UserToken
from server.test.abstract_test import AbstractTest
from server.test.seed import (user_sarah_name, service_wiki_name, service_mail_name, service_cloud_name,
                              user_sarah_user_token_network, user_john_name, service_network_name)
from server.tools import dt_now


class TestUserToken(AbstractTest):

    def _get_token(self):
        return self.get("/api/user_tokens/generate_token")["value"]

    def test_user_tokens(self):
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(1, len(user_tokens))
        self.assertIsNone(user_tokens[0].get("hashed_token"))

        user_tokens[0]["name"] = "changed"
        self.put("/api/user_tokens", body=user_tokens[0])

        user_tokens_updated = self.get("/api/user_tokens")
        self.assertEqual("changed", user_tokens_updated[0]["name"])
        self.assertIsNone(user_tokens[0].get("hashed_token"))

    def test_user_tokens_with_service(self):
        service = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens", query_data={"service_id": service.id})
        self.assertEqual(1, len(user_tokens))

    def test_user_tokens_with_service_not_found(self):
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens", query_data={"service_id": -1})
        self.assertEqual(0, len(user_tokens))

    def test_generate(self):
        self.login("urn:sarah")
        token_value = self.get("/api/user_tokens/generate_token")["value"]
        self.assertIsNotNone(token_value)

    def test_create_user_token(self):
        sarah_id = self.find_entity_by_name(User, user_sarah_name).id

        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(1, len(user_tokens))

        hashed_token = self._get_token()
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        user_token = {"name": "token", "hashed_token": hashed_token, "user_id": sarah_id, "service_id": wiki.id}
        self.post("/api/user_tokens", body=user_token)

        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(2, len(user_tokens))

    def test_create_user_token_without_server_token(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        wiki = self.find_entity_by_name(Service, service_wiki_name)

        self.login("urn:sarah")
        user_token = {"name": "token", "hashed_token": generate_token(), "user_id": sarah.id, "service_id": wiki.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_with_tampering(self):
        sarah_id = self.find_entity_by_name(User, user_sarah_name).id

        self.login("urn:sarah")
        self._get_token()
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        user_token = {"name": "token", "hashed_token": "nope", "user_id": sarah_id, "service_id": wiki.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_platform_admin(self):
        john_id = self.find_entity_by_name(User, user_john_name).id
        self.login("urn:john")

        hashed_token = self._get_token()
        service = self.find_entity_by_name(Service, service_cloud_name)
        user_token = {"name": "token", "hashed_token": hashed_token, "user_id": john_id, "service_id": service.id}
        self.post("/api/user_tokens", body=user_token)

        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(1, len(user_tokens))

    def test_create_user_token_for_other(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        self.login("urn:james")
        user_token = {"user_id": sarah.id, "hashed_token": self._get_token()}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_service_not_token_enabled(self):
        sarah_id = self.find_entity_by_name(User, user_sarah_name).id
        self.login("urn:sarah")

        hashed_token = self._get_token()
        mail = self.find_entity_by_name(Service, service_mail_name)
        user_token = {"name": "token", "hashed_token": hashed_token, "user_id": sarah_id, "service_id": mail.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_service_not_allowed(self):
        betty_id = self.find_entity_by_name(User, "betty").id
        self.login("urn:betty")

        hashed_token = self._get_token()
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        user_token = {"name": "token", "hashed_token": hashed_token, "user_id": betty_id, "service_id": cloud.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_delete_user_token(self):
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens")
        self.delete("/api/user_tokens", user_tokens[0]["id"])
        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(0, len(user_tokens))

    def test_delete_user_token_forbidden(self):
        self.login("urn:james")
        user_token = UserToken.query.first()
        self.delete("/api/user_tokens", user_token.id, response_status_code=403)

    def test_renew_lease(self):
        self.expire_user_token(user_sarah_user_token_network)
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens")

        self.put("/api/user_tokens/renew_lease", body=user_tokens[0])

        user_tokens_updated = self.get("/api/user_tokens")
        created_at = int(user_tokens_updated[0]["created_at"])
        one_day_ago = int((dt_now() - datetime.timedelta(days=1)).timestamp())
        self.assertTrue(created_at > one_day_ago)
        self.assertIsNone(user_tokens[0].get("hashed_token"))
