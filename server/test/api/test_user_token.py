# -*- coding: future_fstrings -*-
from secrets import token_urlsafe

from server.db.domain import Service, User, UserToken
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_name, service_wiki_name, service_mail_name, service_cloud_name


class TestUserToken(AbstractTest):

    def test_user_tokens(self):
        self.login("urn:sarah")
        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(1, len(user_tokens))

        user_tokens[0]["name"] = "changed"
        self.put("/api/user_tokens", body=user_tokens[0])
        user_tokens = self.get("/api/user_tokens")
        self.assertEqual("changed", user_tokens[0]["name"])

    def test_generate(self):
        self.login("urn:sarah")
        token_value = self.get("/api/user_tokens/generate_token")["value"]
        self.assertIsNotNone(token_value)

    def test_create_user_token(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        wiki = self.find_entity_by_name(Service, service_wiki_name)

        self.login("urn:sarah")
        user_token = {"name": "token", "hashed_token": token_urlsafe(), "user_id": sarah.id, "service_id": wiki.id}
        self.post("/api/user_tokens", body=user_token)

        user_tokens = self.get("/api/user_tokens")
        self.assertEqual(2, len(user_tokens))

    def test_create_user_token_for_other(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        self.login("urn:james")
        user_token = {"user_id": sarah.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_service_not_token_enabled(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        mail = self.find_entity_by_name(Service, service_mail_name)

        self.login("urn:sarah")
        user_token = {"name": "token", "hashed_token": token_urlsafe(), "user_id": sarah.id, "service_id": mail.id}
        self.post("/api/user_tokens", body=user_token, response_status_code=403)

    def test_create_user_token_service_not_allowed(self):
        betty = self.find_entity_by_name(User, "betty")
        cloud = self.find_entity_by_name(Service, service_cloud_name)

        self.login("urn:betty")
        user_token = {"name": "token", "hashed_token": token_urlsafe(), "user_id": betty.id, "service_id": cloud.id}
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
