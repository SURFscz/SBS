# -*- coding: future_fstrings -*-
import datetime
import uuid

from flask import current_app
from munch import munchify

from server.api.user import generate_unique_username
from server.auth.user_claims import claim_attribute_mapping
from server.db.db import db
from server.db.domain import Organisation, Collaboration, User
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name, ai_computing_name, roger_name, john_name, james_name, mike_name, \
    uva_research_name


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)
        self.assertEqual(user["admin"], False)

    def test_provision_me_identity_header(self):
        headers = {self.uid_header_name(): "uid:new",
                   self.application_ui_header_name().upper(): "123456789",
                   f"{current_app.app_config.oidc_prefix}EDUPERSON_PRINCIPAL_NAME": "john.doe"}
        user = self.client.get("/api/users/me",
                               headers=headers,
                               environ_overrides=headers).json
        self.assertEqual(user["guest"], False)
        self.assertEqual(user["admin"], False)
        self.assertEqual(user["uid"], "uid:new")
        self.assertEqual(user["application_uid"], "123456789")
        self.assertEqual(user["eduperson_principal_name"], "john.doe")

    def test_me_existing_user(self):
        user = self.client.get("/api/users/me", environ_overrides={self.uid_header_name(): "urn:john"}).json
        not_changed_user = self.client.get("/api/users/me",
                                           environ_overrides={
                                               self.uid_header_name(): "urn:john",
                                               f"{current_app.app_config.oidc_prefix}NAME": "urn:john"
                                           }).json
        self.assertDictEqual(user, not_changed_user)

        self.assertEqual(user["guest"], False)
        self.assertEqual(user["uid"], "urn:john")

        self.assertEqual(user["organisation_memberships"][0]["organisation"]["name"], uuc_name)
        self.assertIsNotNone(user["collaboration_memberships"][0]["collaboration_id"], uuc_name)

    def test_me_user_suspended(self):
        self.mark_user_suspended(john_name)
        res = self.client.get("/api/users/me", environ_overrides={self.uid_header_name(): "urn:john"})
        self.assertEqual(409, res.status_code)

    def test_me_user_with_suspend_notifactions(self):
        res = self.client.get("/api/users/me", environ_overrides={self.uid_header_name(): "urn:two_suspend"})
        self.assertEquals(True, res.json["successfully_activated"])

    def test_activate_by_organisation_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.do_test_activate("urn:mary", {"organisation_id": organisation_id})

    def test_activate_by_collaboration_admin(self):
        collaboration_id = Collaboration.query.filter(Collaboration.name == uva_research_name).one().id
        self.do_test_activate("urn:sarah", {"collaboration_id": collaboration_id})

    def do_test_activate(self, login_urn, object_dict):
        user = User.query.filter(User.name == "suspended").one()
        self.assertEqual(True, user.suspended)
        self.assertEqual(2, len(user.suspend_notifications))

        self.login(login_urn)
        self.put("/api/users/activate", body={**object_dict, "user_id": user.id})

        user = User.query.filter(User.name == "suspended").one()
        self.assertEqual(False, user.suspended)
        retention = current_app.app_config.retention
        retention_date = datetime.datetime.now() - datetime.timedelta(days=retention.allowed_inactive_period_days + 1)
        self.assertTrue(user.last_login_date > retention_date)
        self.assertEqual(1, len(user.suspend_notifications))

    def test_search(self):
        self.login("urn:john")
        res = self.get("/api/users/search", query_data={"q": "roger"})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/search", query_data={"q": "roger@roger"})
        self.assertEqual(1, len(res))

        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id

        res = self.get("/api/users/search", query_data={"q": "john", "organisation_id": organisation_id})
        self.assertEqual(1, len(res))

        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/users/search", query_data={"q": "john",
                                                        "organisation_id": organisation_id,
                                                        "collaboration_id": collaboration_id})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/search", query_data={"q": "*",
                                                        "collaboration_admins": True})
        self.assertEqual(2, len(res))

        res = self.get("/api/users/search", query_data={"q": "*",
                                                        "organisation_admins": True})
        self.assertEqual(4, len(res))

    def test_other_not_allowed(self):
        self.get("/api/users/other", query_data={"uid": "urn:mary"}, response_status_code=403)

    def test_refresh_not_allowed(self):
        self.get("/api/users/refresh", response_status_code=401, with_basic_auth=False)

    def test_other_missing_query_parameter(self):
        self.login("urn:john")
        self.get("/api/users/other", response_status_code=400)

    def test_other(self):
        self.login("urn:john")
        res = self.get("/api/users/other", query_data={"uid": "urn:mary"})
        self.assertEqual("Mary Doe", res["name"])

    def test_users_user_not_allowed(self):
        self.login("urn:mary")
        self.get("/api/users/user", query_data={"uid": "urn:mary"}, with_basic_auth=False, response_status_code=403)
        self.get("/api/users/user", query_data={"uid": "urn:peter"}, with_basic_auth=False, response_status_code=403)

    def test_users_user_without_groups(self):
        res = self.get("/api/users/user", query_data={"uid": "urn:sarah"}, response_status_code=200)
        self.assertEqual("Sarah Cross", res.get("name"))
        self.assertEqual(2, len(res["collaboration_memberships"]))
        self.assertEqual(0, len(res["collaboration_memberships"][0]["groups"]))
        self.assertEqual(0, len(res["collaboration_memberships"][1]["groups"]))

    def test_users_user_with_groups(self):
        res = self.get("/api/users/user", query_data={"uid": "urn:roger"}, response_status_code=200)
        self.assertEqual("Roger Doe", res.get("name"))
        self.assertEqual(1, len(res["collaboration_memberships"]))
        self.assertEqual(1, len(res["collaboration_memberships"][0]["groups"]))
        self.assertEqual("science", res["collaboration_memberships"][0]["groups"][0]["short_name"])

    def test_attribute_aggregation_eppn(self):
        res = self.get("/api/users/attribute_aggregation",
                       query_data={"edu_person_principal_name": "urn:john"})
        self.assertListEqual(["AI computing"], res)

    def test_attribute_aggregation_preference_eppn(self):
        res = self.get("/api/users/attribute_aggregation",
                       query_data={"edu_person_principal_name": "urn:john", "email": "sarah@uva.org"})
        self.assertListEqual(["AI computing"], res)

    def test_attribute_aggregation_email(self):
        res = self.get("/api/users/attribute_aggregation",
                       query_data={"edu_person_principal_name": "nope", "email": "john@example.org"})
        self.assertListEqual(["AI computing"], res)

    def test_attribute_aggregation_404(self):
        self.get("/api/users/attribute_aggregation", query_data={"edu_person_principal_name": "nope"},
                 response_status_code=404)

    def test_error(self):
        self.client.get("/api/users/me", environ_overrides={self.uid_header_name(): "uid"})
        response = self.client.post("/api/users/error")
        self.assertEqual(201, response.status_code)

    def test_provisioning_with_diacritics(self):
        headers = {}
        for claim in claim_attribute_mapping():
            key = "OIDC_CLAIM_" + next(iter(claim))
            headers[key] = "Ã«Ã¤Ã¦Å¡"
        headers["OIDC_CLAIM_CMUID"] = "urn.test"
        user = self.client.get("api/users/me", headers=headers).json
        self.assertEqual("ëäæš", user["email"])

    def test_update(self):
        roger = self.find_entity_by_name(User, roger_name)

        self.login("urn:roger")

        body = {"ssh_key": "ssh_key",
                "ubi_key": "ubi_key",
                "tiqr_key": "tiqr_key",
                "totp_key": "totp_key",
                "id": roger.id,
                "email": "bogus"}

        self.put("/api/users", body, with_basic_auth=False)

        roger = User.query.get(roger.id)
        roger.ssh_key = "ssh_key"

    def test_update_someone_else_forbidden(self):
        james = self.find_entity_by_name(User, james_name)

        self.login("urn:roger")

        self.put("/api/users", {"id": james.id}, with_basic_auth=False, response_status_code=403)

    def test_update_impersonation(self):
        james = self.find_entity_by_name(User, james_name)

        self.login("urn:john")

        body = {"id": james.id,
                "ubi_key": "bogus"}

        self.put("/api/users", body, headers={"X-IMPERSONATE-ID": 999}, with_basic_auth=False)
        james = self.find_entity_by_name(User, james_name)
        self.assertEqual("bogus", james.ubi_key)

    def test_update_user_service_profile_ssh_key_conversion(self):
        user = self.find_entity_by_name(User, john_name)
        self.login("urn:john")

        ssh2_pub = self.read_file("ssh2.pub")
        body = {"ssh_key": ssh2_pub,
                "convertSSHKey": True,
                "id": user.id}
        res = self.put("/api/users", body=body)
        self.assertTrue(res["ssh_key"].startswith("ssh-rsa"))

    def test_update_user_service_profile_ssh_key_conversion_not_default(self):
        user = self.find_entity_by_name(User, john_name)
        self.login("urn:john")
        ssh2_pub = self.read_file("ssh2.pub")
        body = {"ssh_key": ssh2_pub, "id": user.id}
        res = self.put("/api/users", body=body)
        self.assertTrue(res["ssh_key"].startswith("---- BEGIN SSH2 PUBLIC KEY ----"))

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

    def test_provision_me_scoped_affiliation(self):
        environ_overrides = {
            self.uid_header_name(): "uid:new",
            f"{current_app.app_config.oidc_prefix}EDUPERSON_SCOPED_AFFILIATION": "employee@surf.nl"
        }
        user = self.client.get("/api/users/me", environ_overrides=environ_overrides).json
        self.assertEqual(user["schac_home_organisation"], "surf.nl")

    def test_provision_me_scoped_affiliation_parse(self):
        environ_overrides = {
            self.uid_header_name(): "uid:new",
            f"{current_app.app_config.oidc_prefix}EDUPERSON_SCOPED_AFFILIATION": "employee@bla.bla.surf.nl"
        }
        user = self.client.get("/api/users/me", environ_overrides=environ_overrides).json
        self.assertEqual(user["schac_home_organisation"], "surf.nl")

    def test_provision_me_scoped_affiliation_and_schac_home(self):
        environ_overrides = {
            self.uid_header_name(): "uid:new",
            f"{current_app.app_config.oidc_prefix}EDUPERSON_SCOPED_AFFILIATION": "employee@bla.bla.surf.nl",
            f"{current_app.app_config.oidc_prefix}SCHAC_HOME_ORGANISATION": "example.org"
        }
        user = self.client.get("/api/users/me", environ_overrides=environ_overrides).json
        self.assertEqual(user["schac_home_organisation"], "example.org")

    def test_upgrade_super_account(self):
        headers = {f"{current_app.app_config.oidc_prefix}EDUPERSON_PRINCIPAL_NAME": "mike_application_uid"}
        res = self.client.get("/api/users/upgrade_super_user",
                              environ_overrides=headers,
                              headers=headers)
        self.assertEqual(302, res.status_code)
        self.assertEqual("http://localhost:3000", res.location)

        mike = self.find_entity_by_name(User, mike_name)
        self.assertEqual(True, mike.confirmed_super_user)

    def test_upgrade_super_account_forbidden(self):
        headers = {f"{current_app.app_config.oidc_prefix}EDUPERSON_PRINCIPAL_NAME": "sarah_application_uid"}
        res = self.client.get("/api/users/upgrade_super_user",
                              environ_overrides=headers,
                              headers=headers)
        self.assertEqual(403, res.status_code)
