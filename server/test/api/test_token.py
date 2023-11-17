
from sqlalchemy import text

from server.auth.secrets import secure_hash
from server.db.db import db
from server.db.domain import UserToken, User
from server.test.abstract_test import AbstractTest
from server.test.seed import (sarah_user_token, service_network_token, sarah_name, service_wiki_token,
                              betty_user_token_wiki,
                              uuc_teachers_name, uuc_short_name)


class TestToken(AbstractTest):

    def test_introspect(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        json = res.json
        self.assertEqual(json["active"], True)
        self.assertEqual(json["user"]["uid"], "urn:sarah")
        self.assertListEqual(sorted([
            f'urn:example:sbs:group:{uuc_short_name}:ai_computing',
            f'urn:example:sbs:group:{uuc_short_name}']
        ), sorted(json["user"]["eduperson_entitlement"]))

        user_token = UserToken.query.filter(UserToken.hashed_token == secure_hash(sarah_user_token)).first()
        self.assertIsNotNone(user_token.last_used_date)

    def test_introspect_one_expired_membership(self):
        user = self.find_entity_by_name(User, "betty")
        cm = [cm for cm in user.collaboration_memberships if cm.collaboration.name == uuc_teachers_name]
        self.expire_collaboration_memberships(cm)

        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_wiki_token}"},
                               data={"token": betty_user_token_wiki}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        user = res.json["user"]
        self.assertListEqual(sorted([
            f'urn:example:sbs:group:{uuc_short_name}:ai_computing',
            f'urn:example:sbs:group:{uuc_short_name}',
            f'urn:example:sbs:group:{uuc_short_name}:monitor1'
        ]), sorted(user["eduperson_entitlement"]))

    def test_introspect_not_connected(self):
        db.session.execute(text("DELETE from services_collaborations"))
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")

    def test_introspect_user_suspended(self):
        self.mark_user_suspended(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "user-suspended")

    def test_introspect_expired_memberships(self):
        self.expire_all_collaboration_memberships(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")

    def test_introspect_invalid_bearer_token(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": "bearer nope"},
                               data={"token": "does-not-matter"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(401, res.status_code)

    def test_introspect_invalid_user_token(self):
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": "nope"}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-unknown")
        self.assertEqual(res.json["active"], False)

    def test_introspect_expired_user_token(self):
        self.expire_user_token(sarah_user_token)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")
        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["status"], "token-expired")
        self.assertEqual(res.json["active"], False)

    def test_introspect_expired_collaboration(self):
        self.expire_collaborations(sarah_name)
        res = self.client.post("/api/tokens/introspect", headers={"Authorization": f"bearer {service_network_token}"},
                               data={"token": sarah_user_token}, content_type="application/x-www-form-urlencoded")

        self.assertEqual(200, res.status_code)
        self.assertEqual(res.json["active"], False)
        self.assertEqual(res.json["status"], "token-not-connected")
