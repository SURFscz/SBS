# -*- coding: future_fstrings -*-

from jwt import algorithms

from server.auth.mfa import _get_algorithm, eligible_users_to_reset_token
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestSecurity(AbstractTest):

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

    def test_eligible_users_to_reset_token_coll_members(self):
        user = User.query.filter(User.uid == "urn:roger").one()
        res = eligible_users_to_reset_token(user)
        self.assertEqual(1, len(res))
        self.assertEqual("sarah@uva.org", res[0]["email"])

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
