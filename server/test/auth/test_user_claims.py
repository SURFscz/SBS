# -*- coding: future_fstrings -*-
import uuid

from munch import munchify

from server.auth.user_claims import add_user_claims, generate_unique_username
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest


class TestUserClaims(AbstractTest):

    def test_add_user_claims(self):
        user = User()
        add_user_claims({}, "urn:johny", user)
        self.assertEqual("urn:johny", user.name)

    def test_add_user_claims_affiliation(self):
        user = User()
        add_user_claims({"eduperson_scoped_affiliation": ["teacher@sub.uni.org"]}, "urn:johny", user)
        self.assertEqual("uni.org", user.schac_home_organisation)

    def test_add_user_claims_user_name(self):
        user = User()
        add_user_claims({"given_name": "John", "family_name": "Doe"}, "urn:johny", user)
        self.assertEqual("jdoe", user.username)

    def test_add_user_claims_user_name_eduperson_principal_name(self):
        user = User()
        add_user_claims({"given_name": "John", "family_name": "Doe",
                         "eduperson_principal_name": "mettens@example.com.org"}, "urn:johny", user)
        self.assertEqual("mettens", user.username)

    def test_generate_unique_username(self):
        # we don't want this in the normal seed
        for username in ["jdoe", "jdoe2", "cdoemanchi", "cdoemanchi2", "cdoemanchi3", "u", "u2"]:
            db.session.merge(User(uid=str(uuid.uuid4()), username=username, created_by="test", updated_by="test",
                                  name="name"))
        db.session.commit()
        names = [("John2", "Doe,"), ("Cinderella!", "Doemanchinice"), (None, "髙橋 大"), ("påré", "ÄÄ")]
        short_names = [generate_unique_username(munchify({"given_name": n[0], "family_name": n[1]})) for n in names]
        self.assertListEqual(["jdoe3", "cdoemanchi4", "u3", "paa"], short_names)

    def test_generate_unique_username_random(self):
        username = generate_unique_username(munchify({"given_name": "John", "family_name": "Doe"}), 1)
        self.assertEqual(14, len(username))
