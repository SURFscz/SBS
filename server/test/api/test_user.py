import datetime
import os

import requests
import responses
from flask import current_app
from werkzeug.exceptions import BadRequest

from server.auth.security import CSRF_TOKEN
from server.db.db import db
from server.db.domain import Organisation, Collaboration, User, Aup
from server.test.abstract_test import AbstractTest
from server.test.seed import (unihard_name, co_ai_computing_name, user_roger_name, user_john_name, user_james_name,
                              co_research_name, co_ai_computing_uuid, user_sarah_name, service_storage_entity_id,
                              service_demo_sp_entity_id, service_ssh_ufra_entity_id, service_scheduler_entity_id,
                              service_empty_entity_id)
from server.tools import dt_now, read_file


class TestUser(AbstractTest):

    def test_me_anonymous(self):
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)
        self.assertEqual(user["admin"], False)

    def test_provision_me_generated_user_name(self):
        self.login("uid:new", user_info={"given_name": "mary", "family_name": "poppins", "email": "mp@ex.com"})
        user = self.client.get("/api/users/me").json

        self.assertEqual(user["username"], "mpoppins")

    def test_me_existing_user(self):
        self.login("urn:john")
        user = self.client.get("/api/users/me", ).json
        not_changed_user = self.client.get("/api/users/me").json
        self.assertListEqual(user["collaboration_memberships"], not_changed_user["collaboration_memberships"])

    def test_personal(self):
        self.login("urn:john")
        user = self.client.get("/api/users/personal", ).json
        self.assertTrue("email" in user)

    def test_me_user_suspended(self):
        self.mark_user_suspended(user_john_name)
        self.login("urn:john")
        res = self.client.get("/api/users/me")
        self.assertEqual(200, res.status_code)
        self.assertFalse(res.json["suspended"])

    def test_me_user_with_additional_data(self):
        self.login("urn:peter")
        res = self.get("/api/users/me")
        self.assertEqual(2, len(res["collaboration_requests"]))
        self.assertEqual(1, len(res["join_requests"]))
        self.assertEqual(2, len(res["services_without_aup"]))
        self.assertEqual(2, len(res["service_emails"]))
        self.assertEqual(1, len(res["service_collaborations"]))

    def test_me_after_delete(self):
        self.login("urn:jane")
        User.query.filter(User.uid == "urn:jane").delete()
        user = self.client.get("/api/users/me").json
        self.assertEqual(user["guest"], True)

    def test_schac_home_organisation(self):
        self.login("urn:roger")
        user = self.client.get("/api/users/me").json
        self.assertIsNotNone(user["schac_home_organisation"])

    def test_suspended(self):
        self.login("urn:john")
        users = self.get("/api/users/suspended", with_basic_auth=False)
        self.assertEqual(2, len(users))

    def test_reset_totp_requested(self):
        self.login("urn:john")
        users = self.get("/api/users/reset_totp_requested", with_basic_auth=False)
        self.assertEqual(1, len(users))

    def test_activate_by_organisation_admin(self):
        organisation_id = Organisation.query.filter(Organisation.name == unihard_name).one().id
        self.do_test_activate("urn:mary", {"organisation_id": organisation_id})

    def test_activate_by_collaboration_admin(self):
        collaboration_id = Collaboration.query.filter(Collaboration.name == co_research_name).one().id
        self.do_test_activate("urn:sarah", {"collaboration_id": collaboration_id})

    def test_activate_by_platform_admin(self):
        self.do_test_activate("urn:john", {})

    def do_test_activate(self, login_urn, object_dict):
        user = User.query.filter(User.name == "user_deletion_warning").one()
        self.assertEqual(True, user.suspended)

        self.login(login_urn)
        self.put("/api/users/activate", body={**object_dict, "user_id": user.id})

        user = User.query.filter(User.name == "user_deletion_warning").one()
        self.assertEqual(False, user.suspended)
        retention = current_app.app_config.retention
        retention_date = dt_now() - datetime.timedelta(days=retention.allowed_inactive_period_days + 1)
        self.assertTrue(user.last_login_date > retention_date)

    def test_search(self):
        self.login("urn:john")
        res = self.get("/api/users/search", query_data={"q": "roger"})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/search", query_data={"q": "roger@roger"})
        self.assertEqual(1, len(res))

        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id

        res = self.get("/api/users/search", query_data={"q": "john", "organisation_id": organisation_id})
        self.assertEqual(1, len(res))

        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id

        res = self.get("/api/users/search", query_data={"q": "john",
                                                        "organisation_id": organisation_id,
                                                        "collaboration_id": collaboration_id})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/search", query_data={"q": "*",
                                                        "collaboration_admins": True})
        self.assertEqual(4, len(res))

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
        self.assertEqual(0, len(res["collaboration_memberships"]))
        self.assertEqual(2, len(res["organisation_memberships"]))
        self.assertEqual("Research", res["organisation_memberships"][0]["organisation"]["category"])

    def test_find_by_id(self):
        self.login("urn:john")
        user_id = User.query.filter(User.uid == "urn:mary").one().id
        res = self.get("/api/users/find_by_id", query_data={"id": user_id})
        self.assertEqual("urn:mary", res["uid"])
        for attr in ["last_accessed_date", "last_login_date", "service_memberships", "join_requests"]:
            self.assertTrue(attr in res)

    def test_find_by_id_by_org_manager(self):
        self.login("urn:harry")
        user_id = User.query.filter(User.uid == "urn:sarah").one().id
        res = self.get("/api/users/find_by_id", query_data={"id": user_id})
        self.assertEqual("urn:sarah", res["uid"])
        for attr in ["last_accessed_date", "last_login_date", "service_memberships", "join_requests"]:
            self.assertFalse(attr in res)

    def test_find_by_id_by_org_manager_including_org_memberships(self):
        self.login("urn:paul")
        user_id = User.query.filter(User.uid == "urn:jane").one().id
        res = self.get("/api/users/find_by_id", query_data={"id": user_id})
        self.assertEqual(1, len(res["organisation_memberships"]))
        membership = res["organisation_memberships"][0]
        self.assertListEqual(sorted(["role", "organisation"]), sorted(list(membership.keys())))
        self.assertListEqual(sorted(["id", "name"]), sorted(list(membership["organisation"].keys())))

    def test_find_by_id_by_org_manager_not_allowed(self):
        self.login("urn:harry")
        user_id = User.query.filter(User.uid == "urn:roger").one().id
        self.get("/api/users/find_by_id", query_data={"id": user_id}, response_status_code=403)

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

        body = {"ssh_keys": [{"ssh_value": "ssh_key\0\n\r"}],
                "email": "bogus"}
        self.put("/api/users", body, with_basic_auth=False)

        roger = User.query.filter(User.uid == "urn:roger").one()
        self.assertEqual("ssh_key", roger.ssh_keys[0].ssh_value)
        self.assertEqual("jdoe@example", roger.email)

    def test_update_impersonation(self):
        self.login("urn:john")

        body = {"ssh_keys": [{"ssh_value": "bogus"}]}
        james = User.query.filter(User.uid == "urn:james").one()

        self.put("/api/users", body, headers={"X-IMPERSONATE-ID": james.id, "X-IMPERSONATE-UID": james.uid,
                                              "X-IMPERSONATE-NAME": user_james_name}, with_basic_auth=False)
        james = User.query.filter(User.uid == "urn:james").one()
        self.assertEqual("bogus", james.ssh_keys[0].ssh_value)

    def test_update_user_service_profile_ssh2_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("ssh2.pub")

    def test_update_user_service_profile_pem_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("pem.pub")

    def test_update_user_service_profile_pkcs8_key_conversion(self):
        self.do_test_update_user_profile_ssk_key_conversion("pkcs8.pub")

    def do_test_update_user_profile_ssk_key_conversion(self, file_name):
        user = self.find_entity_by_name(User, user_john_name)
        self.login("urn:john")
        ssh2_pub = self.read_file(file_name)
        body = {"ssh_keys": [{"ssh_value": ssh2_pub}],
                "convertSSHKey": True,
                "id": user.id}
        res = self.put("/api/users", body=body)
        self.assertTrue(res["ssh_keys"][0]["ssh_value"].startswith("ssh-rsa"))

    def test_platform_admins(self):
        self.login("urn:john")
        res = self.client.get("/api/users/platform_admins").json
        self.assertEqual(1, len(res["platform_admins"]))

    def test_platform_admins_forbidden(self):
        self.login("urn:sarah")
        self.get("/api/users/platform_admins", with_basic_auth=False, response_status_code=403)

    def test_authorization(self, redirect_uri="http://localhost/redirect"):
        res = self.get("/api/users/authorization", query_data={"state": redirect_uri},
                       with_basic_auth=False)
        self.assertTrue("authorization_endpoint" in res)

        res = self.get("/api/users/authorization", with_basic_auth=False)
        query_dict = self.url_to_query_dict(res["authorization_endpoint"])
        self.assertEqual(redirect_uri, query_dict["state"])

    def test_service_info(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger", "entity_id": service_storage_entity_id},
                       with_basic_auth=False)
        self.assertEqual([{"co_creation": False}], res["organisations"])
        self.assertEqual("example.org", res["schac_home_organisation"])
        self.assertEqual("support@storage.net", res["support_email"])
        self.assertTrue(res["service_connection_allowed"])

    def test_service_info_no_user(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "nope", "entity_id": "nope"},
                       with_basic_auth=False)
        self.assertEqual(1, len(res))
        self.assertFalse(res["service_connection_allowed"])

    def test_service_info_override_access_allowed_all_connections(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger",
                                   "entity_id": service_demo_sp_entity_id},
                       with_basic_auth=False)
        self.assertEqual([{"co_creation": False}], res["organisations"])
        self.assertEqual("example.org", res["schac_home_organisation"])
        self.assertFalse(res["service_connection_allowed"])

    def test_service_info_no_schac_home(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:sarah",
                                   "entity_id": service_ssh_ufra_entity_id},
                       with_basic_auth=False)
        self.assertEqual(0, len(res["organisations"]))
        self.assertIsNone(res["schac_home_organisation"])
        self.assertTrue(res["service_connection_allowed"])

    def test_service_info_no_connection_allowed(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger",
                                   "entity_id": service_empty_entity_id},
                       with_basic_auth=False)
        self.assertFalse(res["service_connection_allowed"])

    def test_service_info_no_service(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger",
                                   "entity_id": "nope"},
                       with_basic_auth=False)
        self.assertFalse(res["service_connection_allowed"])

    def test_service_info_access_allowed_for_all(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger",
                                   "entity_id": service_ssh_ufra_entity_id},
                       with_basic_auth=False)
        self.assertTrue(res["service_connection_allowed"])

    def test_service_info_automatic_connection_allowed_organisations(self):
        res = self.get("/api/users/service_info",
                       query_data={"uid": "urn:roger",
                                   "entity_id": service_scheduler_entity_id},
                       with_basic_auth=False)
        self.assertTrue(res["service_connection_allowed"])

    def test_resume_session_dead_end(self):
        res = self.get("/api/users/resume-session", response_status_code=302)
        query_dict = self.url_to_query_dict(res.location)
        self.assertEqual(self.app.app_config.base_url, query_dict["state"])

    @responses.activate
    def test_resume_session_token_error(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint, status=500)
        res = self.get("/api/users/resume-session", query_data={"code": "123456"}, response_status_code=302)
        self.assertEqual(current_app.app_config.base_url + "/error", res.location)

    @responses.activate
    def test_resume_session_user_info_error(self):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token"}, status=200)
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint, status=500)
        res = self.get("/api/users/resume-session", query_data={"code": "123456"}, response_status_code=302)
        self.assertEqual(current_app.app_config.base_url + "/error", res.location)

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

    def test_delete_other(self):
        self.login("urn:john")

        sarah = self.find_entity_by_name(User, user_sarah_name)
        self.delete("/api/users/delete_other", primary_key=sarah.id, with_basic_auth=False)
        count = User.query.filter(User.uid == sarah.uid).count()
        self.assertEqual(0, count)

    def test_error(self):
        self.post("/api/users/error", body={"status": 403}, with_basic_auth=False, response_status_code=401)

        self.post("/api/users/error", body={"status": 403}, with_basic_auth=True)

        self.login("urn:betty")
        res = self.post("/api/users/error", body={"status": 429}, with_basic_auth=False)
        self.assertDictEqual({}, res)

        res = self.post("/api/users/error", body={"status": 500}, with_basic_auth=False)
        self.assertDictEqual({}, res)

    def test_error_mail(self):
        try:
            mail = self.app.mail
            with mail.record_messages() as outbox:
                self.app.app_config.mail.send_js_exceptions = True
                self.login("urn:sarah")
                me = self.get("/api/users/me", with_basic_auth=False)
                self.post("/api/users/error",
                          body={"weird": "msg"},
                          headers={CSRF_TOKEN: me[CSRF_TOKEN]},
                          response_status_code=201)
                self.assertTrue(len(outbox) > 0)
                mail_msg = outbox[0]
                self.assertTrue("weird" in mail_msg.html)
                self.assertTrue("An error occurred in local" in mail_msg.html)
        finally:
            self.app.app_config.mail.send_js_exceptions = False

    def test_error_mail_rate_limit(self):
        try:
            self.app.app_config.mail.send_js_exceptions = True
            self.login("urn:sarah")
            me = self.get("/api/users/me", with_basic_auth=False)
            for i in range(1, 10):
                self.post("/api/users/error",
                          body={"weird": "msg"},
                          headers={CSRF_TOKEN: me[CSRF_TOKEN]},
                          response_status_code=201)
            self.post("/api/users/error",
                      body={"weird": "msg"},
                      headers={CSRF_TOKEN: me[CSRF_TOKEN]},
                      response_status_code=422)
        finally:
            self.app.app_config.mail.send_js_exceptions = False

    def test_update_date_bug(self):
        roger = self.find_entity_by_name(User, user_roger_name)
        roger_id = roger.id
        now = dt_now()
        roger.last_login_date = now
        roger.last_accessed_date = now

        db.session.merge(roger)
        db.session.commit()

        self.login("urn:roger")
        body = {"id": roger.id,
                "ssh_keys": [],
                "email": "bogus"}
        self.put("/api/users", body, with_basic_auth=False)

        roger = db.session.get(User, roger_id)
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
            self.assertEqual(current_app.app_config.base_url + "/2fa", res.headers.get("Location"))
            user = self.client.get("/api/users/me", ).json

            self.assertFalse(user["second_factor_auth"])
            self.assertFalse(user["second_factor_confirmed"])
            self.assertFalse("organisation_memberships" in user)
            self.assertTrue(user["admin"])

    def test_read_file_not_exists(self):
        def expect_bad_request():
            read_file("nope")

        self.assertRaises(BadRequest, expect_bad_request)

    @responses.activate
    def test_resume_session_with_allowed_idp(self, redirect_expected=None):
        responses.add(responses.POST, current_app.app_config.oidc.token_endpoint,
                      json={"access_token": "some_token", "id_token": self.sign_jwt({"acr": "nope"})},
                      status=200)
        responses.add(responses.GET, current_app.app_config.oidc.userinfo_endpoint,
                      json={"sub": "urn:john", "voperson_external_id": "test@idp.test"},
                      status=200)
        responses.add(responses.GET, current_app.app_config.oidc.jwks_endpoint,
                      read_file("test/data/public.json"), status=200)
        with requests.Session():
            if not redirect_expected:
                redirect_expected = current_app.app_config.base_url

            res = self.client.get("/api/users/resume-session?code=123456")
            self.assertEqual(redirect_expected, res.headers.get("Location"))
            user = self.client.get("/api/users/me", ).json

            self.assertTrue(user["second_factor_confirmed"])
            self.assertTrue("organisation_memberships" in user)

    @responses.activate
    def test_authorization_resume_redirect(self):
        redirect_uri = "http://example.org/redirect_test"
        self.test_authorization(redirect_uri=redirect_uri)
        self.test_resume_session_with_allowed_idp(redirect_expected=redirect_uri)

    def test_query(self):
        res = self.get("/api/users/query", query_data={"q": "AMES"})
        self.assertEqual(1, len(res))
        self.assertEqual("james@example.org", res[0]["email"])

        res = self.get("/api/users/query", query_data={"q": "BYR"})
        self.assertEqual(1, len(res))
        self.assertEqual("james@example.org", res[0]["email"])

        res = self.get("/api/users/query", query_data={"q": "@EX"})
        self.assertEqual(12, len(res))

        res = self.get("/api/users/query", query_data={"q": "@"})
        self.assertEqual(18, len(res))

        res = self.get("/api/users/query", query_data={"q": "dtrh.io"})
        self.assertEqual(1, len(res))

        res = self.get("/api/users/query", query_data={"q": "betty"})
        self.assertEqual(1, len(res))
        memberships = res[0]["collaboration_memberships"]
        self.assertEqual(4, len(memberships))

    def test_aup_agreed(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        aups = Aup.query.filter(Aup.user == sarah).all()
        for aup in aups:
            db.session.delete(aup)

        self.login("urn:sarah")
        res = self.get("/api/collaborations/find_by_identifier",
                       query_data={"identifier": co_ai_computing_uuid},
                       with_basic_auth=False, response_status_code=401)
        self.assertTrue("AUP not accepted" in res["message"])

    def test_update_ssh_control_char(self):
        self.login("urn:james")
        ssh_key = User.query.filter(User.uid == "urn:james").one().ssh_keys[0]
        pub = self.read_file("1.pub")
        body = {"ssh_keys": [{"id": ssh_key.id, "ssh_value": pub}]}
        self.put("/api/users", body, with_basic_auth=False)

        james = User.query.filter(User.uid == "urn:james").one()
        self.assertEqual("AA😡C", james.ssh_keys[0].ssh_value)

    def test_invalid_user_login(self):
        try:
            os.environ["TESTING"] = ""
            mail = self.app.mail
            with mail.record_messages() as outbox:
                res = self.login("uid:new", user_info={"sub": "subby"}, add_default_attributes=False)
                self.assertTrue("http://localhost:3000/missing-attributes" in res.headers.get('Location'))
                self.assertEqual(1, len(outbox))
                mail_msg = outbox[0]
                self.assertListEqual(["sram-support@surf.nl"], mail_msg.to)
                self.assertTrue("subby" in mail_msg.html)

        finally:
            os.environ["TESTING"] = "1"

    def test_invalid_user_login_name(self):
        try:
            os.environ["TESTING"] = ""
            mail = self.app.mail
            with mail.record_messages() as outbox:
                res = self.login("uid:new", user_info={"sub": "subby", "name": "jdoe"},
                                 add_default_attributes=False)
                self.assertTrue("http://localhost:3000/missing-attributes" in res.headers.get('Location'))
                self.assertEqual(1, len(outbox))
                mail_msg = outbox[0]
                self.assertListEqual(["sram-support@surf.nl"], mail_msg.to)
                self.assertTrue("subby" in mail_msg.html)
                self.assertTrue("jdoe" in mail_msg.html)

        finally:
            os.environ["TESTING"] = "1"
