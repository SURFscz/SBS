import json
import os
import uuid

from munch import munchify

from server.auth.user_claims import add_user_claims, generate_unique_username, user_memberships, valid_user_attributes
from server.db.db import db
from server.db.domain import User, UserNameHistory
from server.test.abstract_test import AbstractTest
from server.test.seed import user_jane_name


class TestUserClaims(AbstractTest):

    def test_add_user_claims(self):
        user = User()
        add_user_claims({}, "urn:johny", user)
        self.assertEqual("urn:johny", user.name)
        self.assertIsNotNone(user.external_id)

    def test_add_user_claims_affiliation(self):
        user = User()
        add_user_claims({"voperson_external_id": "teacher@UNIVERSITY"}, "urn:johny", user)
        self.assertEqual("university", user.schac_home_organisation)

    def test_add_user_claims_schac_home_organization(self):
        user = User()
        claims = {"voperson_external_id": "teacher@UNIVERSITY",
                  "schac_home_organization": "hdm.org"}
        add_user_claims(claims, "urn:johny", user)
        self.assertEqual("hdm.org", user.schac_home_organisation)

    def test_add_user_claims_empty_schac_home_organization(self):
        user = User()
        claims = {"voperson_external_id": "teacher@UNIVERSITY",
                  "schac_home_organization": ""}
        add_user_claims(claims, "urn:johny", user)
        self.assertEqual("university", user.schac_home_organisation)

    def test_scoped_scoped_affiliation(self):
        user = User()
        claims = {"edumember_is_member_of": ["urn:collab:org:dev.openconext.local"],
                  "eduperson_principal_name": "foobar6@example.org",
                  "eduperson_affiliation": ["student"],
                  "eduperson_scoped_affiliation": ["student@example.org"],
                  "email": "foobar6@example.com",
                  "email_verified": True, "family_name": "Doe", "given_name": "Foobar6", "name": "Foobar6 Doe",
                  "nickname": "Foobar6 Doe",
                  "preferred_username": "Foobar6 Doe",
                  "schac_home_organization": "imdb.org",
                  "sub": "urn:collab:person:example.org:foobar6",
                  "subject_id": "foobar6@example.com", "uids": ["foobar6"]}
        add_user_claims(claims, "urn:johny", user)
        self.assertEqual("imdb.org", user.schac_home_organisation)
        self.assertEqual("student", user.affiliation)
        self.assertEqual("student@example.org", user.scoped_affiliation)
        self.assertEqual("foobar6@example.org", user.eduperson_principal_name)

    def test_add_user_claims_affiliation_list(self):
        user = User()
        add_user_claims({"voperson_external_id": ["teacher@sub.UNI.org"]}, "urn:johny", user)
        self.assertEqual("sub.uni.org", user.schac_home_organisation)

    def test_add_user_claims_none(self):
        user = User()
        add_user_claims({"voperson_external_id": ["teacher@"]}, "urn:johny", user)
        self.assertIsNone(user.schac_home_organisation)

    def test_add_user_claims_affiliation_defensive(self):
        user = User()
        add_user_claims({"voperson_external_id": "university"}, "urn:johny", user)
        self.assertIsNone(user.schac_home_organisation)

    def test_add_user_claims_no_voperson_external_id(self):
        user = User()
        add_user_claims({}, "urn:johny", user)
        self.assertIsNone(user.schac_home_organisation)

    def test_user_claims_schac_home_org(self):
        user = User()
        user_info_json_str = self.read_file("user_info.json")
        user_info_json = json.loads(user_info_json_str)
        add_user_claims(user_info_json, "urn:new_user", user)
        self.assertEqual("rug", user.schac_home_organisation)

    def test_add_user_claims_external_affiliation(self):
        user = User()
        add_user_claims({"voperson_external_affiliation": "teacher@university"}, "urn:johny", user)
        self.assertEqual("university", user.schac_home_organisation)

    def test_add_user_claims_affiliations_voPEA_voPEI(self):
        user = User()
        add_user_claims({
            "voperson_external_affiliation": "employee@otheruniversity.org",
            "voperson_external_id": ["johny@university.org"]
        }, "urn:johny", user)
        self.assertEqual("university.org", user.schac_home_organisation)

    def test_add_user_claims_empty_entitlements(self):
        user = User()
        add_user_claims({"eduperson_entitlement": []}, "urn:johny", user)
        self.assertIsNone(user.entitlement)

    def test_add_user_claims_user_name(self):
        user = User()
        add_user_claims({"given_name": "John", "family_name": "Doe"}, "urn:johny", user)
        self.assertEqual("jdoe", user.username)

    def test_generate_unique_username(self):
        # we don"t want this in the normal seed
        for username in ["jdoe", "jdoe2", "cdoemanchi", "cdoemanchi2", "cdoemanchi3", "u", "u2"]:
            db.session.merge(User(uid=str(uuid.uuid4()), username=username, created_by="test", updated_by="test",
                                  name="name", external_id=str(uuid.uuid4())))
        db.session.merge(UserNameHistory(username="jdoe3"))
        db.session.commit()
        names = [("John2", "Doe,"), ("Cinderella!", "Doemanchinice"), (None, "髙橋 大"), ("påré", "ÄÄ")]
        short_names = [generate_unique_username(munchify({"given_name": n[0], "family_name": n[1]})) for n in names]
        self.assertListEqual(["jdoe4", "cdoemanchi4", "u3", "paa"], short_names)

    def test_generate_unique_username_random(self):
        username = generate_unique_username(munchify({"given_name": "John", "family_name": "Doe"}), 1)
        self.assertEqual(14, len(username))

    def test_eppn_generate_unique_username(self):
        user = User(eduperson_principal_name="sarah-lee")
        username = generate_unique_username(user)
        # We don"t use the eduperson_principal_name anymore
        self.assertEqual("u", username)

    def test_bugfix_empty_user_claims_affiliation_list(self):
        user = User()
        add_user_claims({"voperson_external_id": []}, "urn:johny", user)
        self.assertIsNone(user.schac_home_organisation)

    def test_urn_collab(self):
        user = User()
        sub = "urn:collab:person:example.com:admin"
        eppn = "admin@example.com"
        add_user_claims({"sub": sub, "eduperson_principal_name": eppn}, "urn:johny", user)
        self.assertEqual(sub, user.collab_person_id)
        self.assertEqual(sub, user.uid)
        self.assertEqual(eppn, user.eduperson_principal_name)

    def test_user_memberships(self):
        user = self.find_entity_by_name(User, user_jane_name)
        connected_collaborations = [cm.collaboration for cm in user.collaboration_memberships]
        memberships = user_memberships(user, connected_collaborations)
        self.assertEqual(3, len(memberships))

        self.expire_collaborations(user_jane_name)
        user = self.find_entity_by_name(User, user_jane_name)
        connected_collaborations = [cm.collaboration for cm in user.collaboration_memberships]

        memberships = user_memberships(user, connected_collaborations)
        self.assertEqual(0, len(memberships))

    def test_user_memberships_suspended_co(self):
        self.suspend_collaborations(user_jane_name)
        user = self.find_entity_by_name(User, user_jane_name)
        connected_collaborations = [cm.collaboration for cm in user.collaboration_memberships]
        memberships = user_memberships(user, connected_collaborations)
        self.assertEqual(0, len(memberships))

    def test_cleared_attributes(self):
        try:
            os.environ["TESTING"] = ""
            mail = self.app.mail
            with mail.record_messages() as outbox:
                user = User(uid="urn:john", name="jdoe", email="jdoe@example.com", scoped_affiliation="test")
                add_user_claims({
                    "voperson_external_id": "eppn",
                    "eduperson_entitlement": ["e1", "e2"],
                    "eduperson_scoped_affiliation": []
                }, "urn:john", user)
                self.assertEqual(1, len(outbox))
                mail_msg = outbox[0]
                self.assertListEqual(["sram-support@surf.nl"], mail_msg.to)
                for name in ["name", "email", "uid"]:
                    self.assertTrue(name in mail_msg.html)

        finally:
            os.environ["TESTING"] = "1"

    def test_valid_user_attributes(self):
        attributes = {
            "given_name": " John ",
            "family_name": " Doe "
        }
        self.assertFalse(valid_user_attributes(attributes))
        self.assertEqual("John Doe", attributes.get("name"))
