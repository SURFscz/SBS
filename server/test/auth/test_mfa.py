import uuid

from jwt import algorithms

from server.auth.mfa import _get_algorithm, eligible_users_to_reset_token, mfa_idp_allowed, user_requires_sram_mfa
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name


class TestMFA(AbstractTest):

    def test_get_algorithm(self):
        self.assertEqual(_get_algorithm({"kty": "rsa"}), algorithms.RSAAlgorithm)
        self.assertEqual(_get_algorithm({"kty": "ec"}), algorithms.ECAlgorithm)
        self.assertEqual(_get_algorithm({"kty": "hmac"}), algorithms.HMACAlgorithm)

        def unsupported_algorithm():
            _get_algorithm({"kty": "nope"})

        self.assertRaises(ValueError, unsupported_algorithm)

    def test_eligible_users_to_reset_token_no_user_information(self):
        res = eligible_users_to_reset_token(User(organisation_memberships=[], collaboration_memberships=[]))
        self.assertEqual(1, len(res))
        self.assertEqual(self.app.app_config.mail.info_email, res[0]["email"])

    def test_eligible_users_to_reset_token_org_members(self):
        user = User.query.filter(User.uid == "urn:john").one()
        res = eligible_users_to_reset_token(user)
        self.assertEqual(1, len(res))
        self.assertEqual("mary@example.org", res[0]["email"])
        self.assertEqual(unihard_name, res[0]["unit"])

    def test_eligible_users_to_reset_token_coll_members(self):
        user = User.query.filter(User.uid == "urn:roger").one()
        res = eligible_users_to_reset_token(user)
        self.assertEqual(1, len(res))
        self.assertEqual("sarah@uni-franeker.nl", res[0]["email"])
        self.assertEqual("Research", res[0]["unit"])

    def test_eligible_users_to_reset_token_coll_org_members(self):
        user = User.query.filter(User.uid == "urn:roger").one()
        for coll_membership in user.collaboration_memberships:
            for membership in coll_membership.collaboration.collaboration_memberships:
                membership.role = "member"
                db.session.add(membership)
        db.session.commit()

        res = eligible_users_to_reset_token(user)
        self.assertEqual(2, len(res))

    def test_eligible_users_to_reset_token_schac_home_fallback(self):
        user = User.query.filter(User.uid == "urn:james").one()
        res = eligible_users_to_reset_token(user)
        self.assertEqual(4, len(res))
        for user in res:
            self.assertEqual(unihard_name, user["unit"])

    def test_mfa_idp_allowed(self):
        self.assertTrue(mfa_idp_allowed(User(schac_home_organisation="idp.test"), entity_id=None))
        self.assertTrue(mfa_idp_allowed(User(schac_home_organisation="idp2.test"), entity_id=None))
        self.assertFalse(mfa_idp_allowed(User(schac_home_organisation="idp3.test"), entity_id=None))

        self.assertTrue(mfa_idp_allowed(User(schac_home_organisation="SUB.IDP.TEST"), entity_id=None))
        self.assertTrue(mfa_idp_allowed(User(schac_home_organisation="nope"), entity_id="HTTPS://IDP.TEST"))

        self.assertFalse(mfa_idp_allowed(User(schac_home_organisation="nope"), entity_id="nope"))

    def test_user_requires_sram_mfa(self):
        user = User(schac_home_organisation="idp.test", second_factor_auth="secret", uid="uid.nope",
                    external_id=uuid.uuid4(), created_by="system", updated_by="system")
        self.assertFalse(user_requires_sram_mfa(user))
        self.assertIsNone(user.second_factor_auth)
