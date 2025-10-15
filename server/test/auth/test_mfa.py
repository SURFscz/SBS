import uuid

from jwt import algorithms

from server.auth.mfa import _get_algorithm, eligible_users_to_reset_token, mfa_idp_allowed, user_requires_sram_mfa
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import unihard_name, co_teachers_name


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
        emails = ["boss@example.org"]
        self.assertListEqual(emails, sorted([u["email"] for u in res]))

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
        self.assertEqual(1, len(res))

    def test_eligible_users_to_reset_token_schac_home_fallback(self):
        user = User.query.filter(User.uid == "urn:james").one()
        res = eligible_users_to_reset_token(user)
        self.assertEqual(2, len(res))
        for user in res:
            self.assertEqual(unihard_name, user["unit"])

    def test_eligible_users_to_reset_token_unit_managers(self):
        user = User.query.filter(User.uid == "urn:betty").one()
        for co_membership in user.collaboration_memberships:
            for m in co_membership.collaboration.collaboration_memberships:
                m.role = "member"
                self.save_entity(m)

        user = User.query.filter(User.uid == "urn:betty").one()
        res = eligible_users_to_reset_token(user)
        emails = sorted(['harry@example.org', 'paul@ucc.org'])
        self.assertListEqual(emails, sorted([u["email"] for u in res]))

    def test_eligible_users_to_reset_token_exclude_non_managers(self):
        # CO teachers has unit research and organisation Harderwijk has no research managers - after deleting paul and
        # roger - and the CO has no admins - after deleting urn:extra_admin. Expecting the admins John and Mary as
        # eligible users, as all other membership of betty are deleted except for CO teachers
        users = User.query.filter(User.uid.in_(["urn:paul", "urn:roger", "urn:extra_admin"])).all()
        for user in users:
            db.session.delete(user)
        db.session.commit()

        betty = User.query.filter(User.uid == "urn:betty").one()
        for co_membership in betty.collaboration_memberships:
            if co_membership.collaboration.name != co_teachers_name:
                db.session.delete(co_membership)
        db.session.commit()

        res = eligible_users_to_reset_token(betty)
        emails = sorted(["john@example.org", "mary@example.org"])
        self.assertListEqual(emails, sorted([u["email"] for u in res]))

    def test_eligible_users_to_reset_token_include_general_managers(self):
        # CO teachers has unit research and organisation Harderwijk has no research managers - after deleting roger -
        # and one manager without units - after deleting the units of paul organisation memberships - and the CO has no
        # admins - after deleting urn:extra_admin. Expecting the manager paul as eligible users, as all other
        # memberships of betty are deleted except for CO teachers
        users = User.query.filter(User.uid.in_(["urn:roger", "urn:extra_admin"])).all()
        for user in users:
            db.session.delete(user)
        paul = User.query.filter(User.uid == "urn:paul").one()
        for org_membership in paul.organisation_memberships:
            org_membership.units.clear()
            db.session.merge(org_membership)
        db.session.commit()

        betty = User.query.filter(User.uid == "urn:betty").one()
        for co_membership in betty.collaboration_memberships:
            if co_membership.collaboration.name != co_teachers_name:
                db.session.delete(co_membership)
        db.session.commit()

        res = eligible_users_to_reset_token(betty)
        emails = sorted(["paul@ucc.org"])
        self.assertListEqual(emails, sorted([u["email"] for u in res]))

    def test_eligible_users_to_reset_token_include_schac_home_managers(self):
        # Paul has no collaboration memberships. Expecting the manager harry from the organisation Harderwijk as
        # eligible user
        paul = User.query.filter(User.uid == "urn:paul").one()
        for co_membership in paul.collaboration_memberships:
            db.session.delete(co_membership)
        db.session.commit()

        res = eligible_users_to_reset_token(paul)
        emails = sorted(["harry@example.org"])
        self.assertListEqual(emails, sorted([u["email"] for u in res]))

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
