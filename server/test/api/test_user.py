# -*- coding: future_fstrings -*-
import datetime
import os
from urllib import parse

import requests
import responses
from flask import current_app

from server.db.db import db
from server.db.defaults import full_text_search_autocomplete_limit
from server.db.domain import Organisation, Collaboration, User
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name, ai_computing_name, roger_name, john_name, james_name, uva_research_name
from server.tools import read_file


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)
        self.assertEqual(user["admin"], False)

    def test_provision_me_generated_user_name(self):
        self.login("uid:new", user_info={"given_name": "mary", "family_name": "poppins"})
        user = self.client.get("/api/users/me").json

        self.assertEqual(user["username"], "mpoppins")

    def test_me_existing_user(self):
        self.login("urn:john")
        user = self.client.get("/api/users/me", ).json
        not_changed_user = self.client.get("/api/users/me").json
        self.assertDictEqual(user, not_changed_user)

    def test_me_user_suspended(self):
        self.mark_user_suspended(john_name)
        self.login("urn:john")
        res = self.client.get("/api/users/me")
        self.assertEqual(409, res.status_code)

    def test_me_user_with_suspend_notifactions(self):
        self.login("urn:two_suspend")
        res = self.client.get("/api/users/me")
        self.assertEqual(True, res.json["successfully_activated"])

    def test_me_user_with_collaboration_requests(self):
        self.login("urn:peter")
        res = self.get("/api/users/me")
        self.assertEqual(2, len(res["collaboration_requests"]))
        self.assertEqual(1, len(res["join_requests"]))

    def test_me_after_delete(self):
        self.login("urn:jane")
        User.query.filter(User.uid == "urn:jane").delete()
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)

    def test_suspended(self):
        self.login("urn:john")
        users = self.get("/api/users/suspended", with_basic_auth=False)
        self.assertEqual(2, len(users))

    def test_activate_by_organisation_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == uuc_name).one().id
        self.do_test_activate("urn:mary", {"organisation_id": organisation_id})

    def test_activate_by_collaboration_admin(self):
        collaboration_id = Collaboration.query.filter(Collaboration.name == uva_research_name).one().id
        self.do_test_activate("urn:sarah", {"collaboration_id": collaboration_id})

    def test_activate_by_platform_admin(self):
        self.do_test_activate("urn:john", {})

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
        self.assertEqual(3, len(res))

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
        self.assertEqual(0, len(res["collaboration_memberships"]))
        self.assertEqual(1, len(res["organisation_memberships"]))
        self.assertEqual("Research", res["organisation_memberships"][0]["organisation"]["category"])

    def test_find_by_id(self):
        self.login("urn:john")
        user_id = User.query.filter(User.uid == "urn:mary").one().id
        res = self.get("/api/users/find_by_id", query_data={"id": user_id})
        self.assertEqual("urn:mary", res["uid"])

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

    def test_update(self):
        self.login("urn:roger")

        body = {"ssh_keys": [{"ssh_value": "ssh_key"}],
                "email": "bogus"}

        self.put("/api/users", body, with_basic_auth=False)

        roger = User.query.filter(User.uid == "urn:roger").one()
        self.assertEqual("ssh_key", roger.ssh_keys[0].ssh_value)
        self.assertIsNone(roger.email)

    def test_update_impersonation(self):
        self.login("urn:john")

        body = {"ssh_keys": [{"ssh_value": "bogus"}]}
        james = User.query.filter(User.uid == "urn:james").one()

        self.put("/api/users", body, headers={"X-IMPERSONATE-ID": james.id, "X-IMPERSONATE-UID": james.uid,
                                              "X-IMPERSONATE-NAME": james_name}, with_basic_auth=False)
        james = User.query.filter(User.uid == "urn:james").one()
        self.assertEqual("bogus", james.ssh_keys[0].ssh_value)

    def test_update_user_service_profile_ssh2_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("ssh2.pub")

    def test_update_user_service_profile_pem_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("pem.pub")

    def test_update_user_service_profile_pkcs8_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("pkcs8.pub")

    def do_test_update_user_profile_ssk_key_conversion(self, file_name):
        user = self.find_entity_by_name(User, john_name)
        self.login("urn:john")
        ssh2_pub = self.read_file(file_name)
        body = {"ssh_keys": [{"ssh_value": ssh2_pub}],
                "convertSSHKey": True,
                "id": user.id}
        res = self.put("/api/users", body=body)
        self.assertTrue(res["ssh_keys"][0]["ssh_value"].startswith("ssh-rsa"))

    def test_upgrade_super_account(self):
        self.login("urn:mike")
        res = self.client.get("/api/users/upgrade_super_user")
        self.assertEqual(302, res.status_code)
        self.assertEqual("http://localhost:3000", res.location)

        mike = User.query.filter(User.uid == "urn:mike").one()
        self.assertEqual(True, mike.confirmed_super_user)

    def test_upgrade_super_account_forbidden(self):
        self.login("urn:sarah")
        self.get("/api/users/upgrade_super_user", with_basic_auth=False, response_status_code=403)

    def test_platform_admins(self):
        self.login("urn:john")
        res = self.client.get("/api/users/platform_admins").json

        self.assertTrue(res["admin_users_upgrade"])
        self.assertEqual(2, len(res["platform_admins"]))

    def test_platform_admins_forbidden(self):
        self.login("urn:sarah")
        self.get("/api/users/platform_admins", with_basic_auth=False, response_status_code=403)

    def test_authorization(self):
        res = self.get("/api/users/authorization", query_data={"state": "http://localhost/redirect"})
        self.assertTrue("authorization_endpoint" in res)

        res = self.get("/api/users/authorization")
        query_dict = dict(parse.parse_qs(parse.urlsplit(res["authorization_endpoint"]).query))
        self.assertListEqual(["http://localhost/redirect"], query_dict["state"])

    def test_resume_session_dead_end(self):
        res = self.get("/api/users/resume-session", response_status_code=302)
        query_dict = dict(parse.parse_qs(parse.urlsplit(res.location).query))
        self.assertListEqual(["http://localhost:3000"], query_dict["state"])

    @responses.activate
    def test_resume_session_token_error(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint, status=500)
        res = self.get("/api/users/resume-session", query_data={"code": "123456"}, response_status_code=302)
        self.assertEqual("http://localhost:3000/error", res.location)

    @responses.activate
    def test_resume_session_user_info_error(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token"}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint, status=500)
        res = self.get("/api/users/resume-session", query_data={"code": "123456"}, response_status_code=302)
        self.assertEqual("http://localhost:3000/error", res.location)

    def test_logout(self):
        self.login("urn:john")
        self.get("/api/users/logout", with_basic_auth=False)
        res = self.get("/api/users/me", with_basic_auth=False)
        self.assertTrue(res["guest"])

    def test_delete(self):
        self.login("urn:john")
        self.delete("/api/users", with_basic_auth=False)
        count = User.query.filter(User.uid == "urn:john").count()
        self.assertEqual(0, count)

    def test_error(self):
        self.post("/api/users/error", body={"error": "403"}, response_status_code=201)

    def test_error_mail(self):
        try:
            del os.environ["TESTING"]
            mail = self.app.mail
            with mail.record_messages() as outbox:
                self.app.app_config.mail.send_js_exceptions = True
                self.login("urn:sarah")
                self.post("/api/users/error", body={"weird": "msg"}, response_status_code=201)
                self.assertEqual(1, len(outbox))
                mail_msg = outbox[0]
                self.assertTrue("weird" in mail_msg.html)
                self.assertTrue("An error occurred in local" in mail_msg.html)
        finally:
            os.environ["TESTING"] = "1"
            self.app.app_config.mail.send_js_exceptions = False

    def test_update_date_bug(self):
        roger = self.find_entity_by_name(User, roger_name)
        now = datetime.datetime.now()
        roger.last_login_date = now
        roger.last_accessed_date = now

        db.session.merge(roger)
        db.session.commit()

        self.login("urn:roger")
        body = {"id": roger.id,
                "ssh_keys": [],
                "email": "bogus"}
        self.put("/api/users", body, with_basic_auth=False)

        roger = User.query.get(roger.id)
        now = now.date()
        self.assertEqual(roger.last_accessed_date.date(), now)
        self.assertEqual(roger.last_login_date.date(), now)

    @responses.activate
    def test_resume_session_with_no_acr(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token", "id_token": self.sign_jwt({"acr": "nope"})},
                      status=200)
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint,
                      json={"sub": "urn:john"}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        with requests.Session():
            res = self.client.get("/api/users/resume-session?code=123456")
            self.assertEqual("http://localhost:3000/2fa", res.headers.get("Location"))
            user = self.client.get("/api/users/me", ).json

            self.assertFalse(user["second_factor_auth"])
            self.assertFalse(user["second_factor_confirmed"])
            self.assertFalse("organisation_memberships" in user)
            self.assertTrue(user["admin"])

    def test_query(self):
        res = self.get("/api/users/query", query_data={"q": "AMES"})
        self.assertEqual(1, len(res))
        self.assertEqual("james@example.org", res[0]["email"])

        res = self.get("/api/users/query", query_data={"q": "BYR"})
        self.assertEqual(1, len(res))
        self.assertEqual("james@example.org", res[0]["email"])

        res = self.get("/api/users/query", query_data={"q": "@EX"})
        self.assertEqual(13, len(res))

        # Ensure max limit of 16 - full_text_search_autocomplete_limit
        res = self.get("/api/users/query", query_data={"q": "@"})
        self.assertEqual(full_text_search_autocomplete_limit, len(res))
