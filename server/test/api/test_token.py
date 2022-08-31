# -*- coding: future_fstrings -*-

from sqlalchemy import text

from server.auth.secrets import secure_hash
from server.db.db import db
from server.db.domain import UserToken
from server.test.abstract_test import AbstractTest
from server.test.seed import sarah_user_token, network_cloud_token, sarah_name


class TestToken(AbstractTest):

    def test_introspect(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], True)
        self.assertEqual(res.json["user"]["uid"], "urn:sarah")

        user_token = UserToken.query.filter(UserToken.hashed_token == secure_hash(sarah_user_token)).first()
        self.assertIsNotNone(user_token.last_used_date)

    def test_introspect_not_connected(self):
        db.session.execute(text("DELETE from services_collaborations"))
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")

    def test_introspect_user_suspended(self):
        self.mark_user_suspended(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "user-suspended")

    def test_introspect_expired_memberships(self):
        self.expire_all_collaboration_memberships(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")

    def test_introspect_invalid_bearer_token(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": "bearer nope"},
                               data={"token": "does-not-matter"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(401, res.status_code)

    def test_introspect_invalid_user_token(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": "nope"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-unknown")
        self.assertEqual(res.json["active"], False)

    def test_introspect_expired_user_token(self):
        self.expire_user_token(sarah_user_token)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-expired")
        self.assertEqual(res.json["active"], False)

    def test_introspect_expired_collaboration(self):
        self.expire_collaborations(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {network_cloud_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")

        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")
