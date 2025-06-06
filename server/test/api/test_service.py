import time
import uuid

import responses
from flask import session
from sqlalchemy import text

from server.api.service import user_service
from server.db.db import db
from server.db.domain import Service, Organisation, ServiceInvitation, User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_network_entity_id, unihard_name, \
    service_network_name, service_scheduler_name, service_wiki_name, service_storage_name, \
    service_cloud_name, service_ssh_name, unifra_name, unihard_secret, \
    user_jane_name, user_roger_name, service_sram_demo_sp, umcpekela_name, service_monitor_name, read_image, \
    service_demo_sp_name


class TestService(AbstractTest):

    def _find_by_name(self, name=service_mail_name):
        service = self.find_entity_by_name(Service, name)
        return self.get(f"api/services/{service.id}")

    def test_find_by_id_forbidden(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:roger")
        self.get(f"api/services/{service.id}", response_status_code=403, with_basic_auth=False)

    def test_find_by_id_access_allowed(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        self.login("urn:sarah")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_access_allowed_through_collaboration_membership(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        self.login("urn:roger")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_access_allowed_through_organisation_collaboration_memberships(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        self.login("urn:betty")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_access_allowed_through_organisation_memberships(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        harry = self.find_entity_by_name(User, "Harry Doe")
        with self.app.app_context():
            session["user"] = {"id": harry.id, "uid": harry.uid, "admin": False}
            self.assertTrue(user_service(service.id, False))

    def test_find_by_id_admin(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        logo = self.client.get(f"/api/images/services/{service.uuid4}").data
        self.assertIsNotNone(logo)

        self.login("urn:john")
        service = self.get(f"api/services/{service.id}", with_basic_auth=False)

        logo_data = self.client.get(service["logo"]).data
        self.assertEqual(logo, logo_data)

    def test_find_by_id_service_admin(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.login("urn:james")
        service_details = self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)
        self.assertEqual(unihard_name, service_details["organisation_name"])

    def test_find_by_id_service_admin_has_bearer_token(self):
        service = self.find_entity_by_name(Service, service_monitor_name)
        self.login("urn:service_admin")
        service_details = self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)
        self.assertTrue(service_details["has_scim_bearer_token"])
        self.assertEqual(2, service_details["collaboration_count"])

    def test_find_by_id_api_call(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        service = self.get(f"api/services/{service.id}")
        self.assertFalse("logo" in service)

    def test_find_by_id_defaults(self):
        service = self.find_entity_by_name(Service, service_demo_sp_name)
        service.oidc_enabled = True
        service.saml_enabled = True
        self.save_entity(service)

        self.login("urn:john")
        service = self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)
        self.assertListEqual([""], service.get("redirect_urls"))
        self.assertListEqual([""], service.get("acs_locations"))

    def test_find_by_entity_id(self):
        res = self.get("api/services/find_by_entity_id", query_data={"entity_id": service_network_entity_id})

        self.assertEqual(res["name"], service_network_name)
        self.assertEqual(unihard_name, res["allowed_organisations"][0]["name"])

    def test_ldap_identifier(self):
        res = self.get("api/services/ldap_identifier")

        self.assertEqual(36, len(res["ldap_identifier"]))

    def test_service_new(self):
        self.login()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            service = self.post("/api/services", body={
                "entity_id": "https://new_application",
                "name": "new_application",
                "token_validity_days": "",
                "privacy_policy": "https://privacy.com",
                "administrators": ["the@ex.org"],
                "abbreviation": "12qw$%OOOKaaaaaaaaaaaaaaaaaaaaaaaaaa"
            })
            self.assertTrue(
                "John Doe invited you to become an admin for application new_application" in outbox[0].html)

            self.assertIsNotNone(service["id"])
            self.assertEqual("new_application", service["name"])
            self.assertEqual("qwoookaaaaaaaaaa", service["abbreviation"])

    def test_service_new_invalid_logo(self):
        self.login()

        res = self.post("/api/services", body={
            "entity_id": "https://new_application",
            "name": "new_application",
            "logo": read_image("invalid.svg", transform=False),
            "privacy_policy": "https://privacy.com",
            "administrators": ["the@ex.org"],
            "abbreviation": "testy"
        }, response_status_code=400)
        self.assertTrue("Invalid SVG format" in res["message"])

    def test_service_invites(self):
        pre_count = ServiceInvitation.query.count()
        self.login("urn:john")
        service_id = self._find_by_name()["id"]
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/services/invites", body={
                "service_id": service_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join",
                "intended_role": "admin",
                "expiry_date": int(time.time())
            })
            post_count = ServiceInvitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)
            invitation = ServiceInvitation.query.filter(ServiceInvitation.invitee_email == "new@example.org").first()
            self.assertEqual("admin", invitation.intended_role)
            self.assertIsNotNone(invitation.expiry_date)

    def test_service_invites_duplicate_mail(self):
        self.login("urn:john")
        service_id = self.find_entity_by_name(Service, service_cloud_name).id
        mail = "admin@cloud.org"
        res = self.put("/api/services/invites", body={"service_id": service_id, "administrators": [mail]},
                       response_status_code=400)
        self.assertIn(mail, res["message"])

    def test_service_invites_invalid_role(self):
        self.login("urn:john")
        service_id = self.find_entity_by_name(Service, service_cloud_name).id
        mail = "othermail@example.org"
        res = self.put("/api/services/invites",
                       body={"service_id": service_id, "administrators": [mail], "intended_role": "koffieleut"},
                       response_status_code=400)
        self.assertIn("Invalid intended role", res["message"])

    def test_service_update(self):
        service = self._find_by_name(service_cloud_name)
        service["name"] = "changed"
        service["ldap_enabled"] = False

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        self.assertEqual("changed", service["name"])
        rows = db.session.execute(text(f"SELECT ldap_password FROM services where id = {service['id']}"))
        row = next(rows)
        self.assertIsNone(row[0])

    def test_service_update_manager_disallowed(self):
        service = self._find_by_name(service_cloud_name)
        service["name"] = "changed"
        service["ldap_enabled"] = False

        self.login("urn:betty")  # service manager
        self.put("/api/services", body=service, with_basic_auth=False, response_status_code=403)

    def test_service_update_disallowed(self):
        disallowed_fields = ["allow_restricted_orgs", "non_member_users_access_allowed", "abbreviation"]
        immutable_fields = ["sweep_scim_last_run", "ldap_password", "scim_bearer_token", "oidc_client_secret"]

        service = self._find_by_name(service_cloud_name)
        orig_service = service.copy()

        service["allow_restricted_orgs"] = True
        service["non_member_users_access_allowed"] = True
        service["entity_id"] = "https://changed"
        service["abbreviation"] = "changed"
        service["sweep_scim_last_run"] = "2063-04-05:12:00:00"
        service["ldap_password"] = "changed"
        service["scim_bearer_token"] = "changed"
        service["oidc_client_secret"] = "changed"

        self.login("urn:james")  # regular service admin
        self.put("/api/services", body=service, with_basic_auth=False)

        service = self._find_by_name(service_cloud_name)
        for field in immutable_fields + disallowed_fields:
            self.assertEqual(orig_service[field], service[field])

    def test_service_update_delete_service_tokens(self):
        service = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:john")
        service = self.get(f"api/services/{service.id}", with_basic_auth=False)
        self.assertEqual(2, len(service["service_tokens"]))

        service["scim_client_enabled"] = False
        service["token_enabled"] = False
        service["pam_web_sso_enabled"] = False

        self.put("/api/services", body=service, with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_network_name)
        self.assertEqual(0, len(service.service_tokens))

    def test_toggle_not_allowed(self):
        service = self.find_entity_by_name(Service, service_cloud_name)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"nope": True},
                 with_basic_auth=False,
                 response_status_code=400)

    def test_toggle_access_allowed_for_all(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.access_allowed_for_all)

        self.login("urn:james")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_all": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_all)
        self.assertFalse(service.non_member_users_access_allowed)

    def test_toggle_access_allowed_for_all_no_automatic_connection_allowed(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.access_allowed_for_all)
        self.assertEqual(2, len(service.allowed_organisations))

        service.automatic_connection_allowed = False
        self.save_entity(service)

        self.login("urn:james")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_all": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_all)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertEqual(4, len(service.allowed_organisations))

    def test_toggle_allow_restricted(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.allow_restricted_orgs)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"allow_restricted_orgs": True},
                 with_basic_auth=False,
                 response_status_code=400)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.allow_restricted_orgs)

    def test_toggle_non_member_users_access_allowed(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertTrue(service.access_allowed_for_crm_organisation)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"non_member_users_access_allowed": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.non_member_users_access_allowed)
        self.assertFalse(service.access_allowed_for_crm_organisation)

        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"non_member_users_access_allowed": False},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertFalse(service.override_access_allowed_all_connections)

    def test_toggle_override_access_allowed_all_connections(self):
        service = self.find_entity_by_name(Service, service_sram_demo_sp)
        self.assertFalse(service.override_access_allowed_all_connections)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"override_access_allowed_all_connections": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_sram_demo_sp)
        self.assertTrue(service.override_access_allowed_all_connections)
        self.assertFalse(service.automatic_connection_allowed)
        self.assertFalse(service.access_allowed_for_all)

    def test_toggle_automatic_connection_allowed(self):
        service = self.find_entity_by_name(Service, service_wiki_name)
        self.assertFalse(service.automatic_connection_allowed)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"automatic_connection_allowed": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.automatic_connection_allowed)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertFalse(service.access_allowed_for_all)

    def test_toggle_automatic_connection_allowed_false(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        self.assertEqual(1, len(service.automatic_connection_allowed_organisations))
        self.assertEqual(1, len(service.allowed_organisations))

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"automatic_connection_allowed": False},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_scheduler_name)
        self.assertFalse(service.automatic_connection_allowed)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertEqual(0, len(service.automatic_connection_allowed_organisations))
        self.assertEqual(2, len(service.allowed_organisations))

    def test_toggle_automatic_connection_allowed_reverse(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        self.assertEqual(1, len(service.automatic_connection_allowed_organisations))
        self.assertEqual(1, len(service.allowed_organisations))

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"automatic_connection_allowed": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_scheduler_name)
        self.assertTrue(service.automatic_connection_allowed)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertFalse(service.access_allowed_for_all)
        self.assertEqual(2, len(service.automatic_connection_allowed_organisations))
        self.assertEqual(0, len(service.allowed_organisations))

    def test_toggle_reset(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        service.automatic_connection_allowed = False
        service.non_member_users_access_allowed = False
        service.access_allowed_for_all = False
        db.session.merge(service)
        db.session.commit()

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"reset": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.automatic_connection_allowed)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertFalse(service.access_allowed_for_all)

    def test_service_update_do_not_clear_ldap_password(self):
        service = self._find_by_name(service_wiki_name)

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        rows = db.session.execute(text(f"SELECT ldap_password FROM services where id = {service['id']}"))
        row = next(rows)
        self.assertIsNotNone(row[0])

    def test_service_update_service_admin(self):
        service = self._find_by_name(service_storage_name)
        service["allow_restricted_orgs"] = False
        service["non_member_users_access_allowed"] = True
        service["entity_id"] = "https://changed"
        service["abbreviation"] = "changed"

        self.login("urn:service_admin")
        self.put("/api/services", body=service, with_basic_auth=False)
        # assert that forbidden attributes are unchanged
        service = self.find_entity_by_name(Service, service_storage_name)

        self.assertEqual(True, service.allow_restricted_orgs)
        self.assertEqual(False, service.non_member_users_access_allowed)
        self.assertEqual("https://changed", service.entity_id)
        self.assertEqual("storage", service.abbreviation)

    def test_service_delete(self):
        pre_count = Service.query.count()
        mail = self._find_by_name()

        self.login("urn:john")
        self.delete("/api/services", primary_key=mail["id"], with_basic_auth=False)

        post_count = Service.query.count()
        self.assertEqual(pre_count - 1, post_count)

    def test_service_name_exists(self):
        res = self.get("/api/services/name_exists", query_data={"name": service_mail_name})
        self.assertEqual(True, res)

        res = self.get("/api/services/name_exists",
                       query_data={"name": service_mail_name, "existing_service": service_mail_name.upper()})
        self.assertEqual(False, res)

        res = self.get("/api/services/name_exists", query_data={"name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/services/name_exists", query_data={"name": "xyc", "existing_service": "xyc"})
        self.assertEqual(False, res)

    def test_service_entity_id_exists(self):
        res = self.get("/api/services/entity_id_exists", query_data={"entity_id": service_network_entity_id})
        self.assertEqual(True, res)

        res = self.get("/api/services/entity_id_exists",
                       query_data={"entity_id": "https://uuc", "existing_service": service_network_entity_id.upper()})
        self.assertEqual(False, res)

        res = self.get("/api/services/entity_id_exists", query_data={"entity_id": "https://xyz"})
        self.assertEqual(False, res)

        res = self.get("/api/services/entity_id_exists",
                       query_data={"entity_id": "https://xyz", "existing_service": "https://xyz"})
        self.assertEqual(False, res)

    def test_service_abbreviation_exists(self):
        res = self.get("/api/services/abbreviation_exists", query_data={"abbreviation": "mail"})
        self.assertEqual(True, res)

        res = self.get("/api/services/abbreviation_exists",
                       query_data={"abbreviation": "mail", "existing_service": "mail"})
        self.assertEqual(False, res)

        res = self.get("/api/services/abbreviation_exists", query_data={"abbreviation": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/services/abbreviation_exists",
                       query_data={"abbreviation": "xyc", "existing_service": "xyc"})
        self.assertEqual(False, res)

    def test_abbreviation_error(self):
        self.post("/api/services", response_status_code=400)

    def test_services_all(self):
        self.login("urn:sarah")
        services = self.get("/api/services/all", with_basic_auth=False)
        self.assertTrue(len(services) > 0)
        service_mail = self.find_by_name(services, service_mail_name)
        self.assertFalse("collaborations_count" in service_mail)
        self.assertFalse("organisations_count" in service_mail)

    def test_services_all_optimized(self):
        self.login("urn:john")
        services = self.get("/api/services/all_optimized", with_basic_auth=False)
        self.assertTrue(len(services) > 0)
        mail = [s for s in services if s["name"] == service_mail_name][0]
        self.assertTrue("collaborations_count" in mail)
        self.assertTrue("connection_requests_count" in mail)
        self.assertTrue(mail["logo"].startswith("http://"))

    def test_services_mine_optimized(self):
        self.login("urn:service_admin")
        services = self.get("/api/services/mine_optimized", with_basic_auth=False)
        self.assertEqual(5, len(services))
        mail = [s for s in services if s["name"] == service_storage_name][0]
        self.assertTrue("collaborations_count" in mail)
        self.assertTrue("connection_requests_count" in mail)
        self.assertTrue(mail["logo"].startswith("http://"))

    def test_services_all_include_counts(self):
        self.login("urn:sarah")
        services = self.get("/api/services/all", query_data={"include_counts": True}, with_basic_auth=False)
        self.assertTrue(len(services) > 0)

        service_mail = self.find_by_name(services, service_mail_name)
        self.assertEqual(1, service_mail["collaborations_count"])
        self.assertEqual(2, len(service_mail["allowed_organisations"]))

        service_uuc = self.find_by_name(services, service_scheduler_name)
        self.assertEqual(1, service_uuc["organisations_count"])
        self.assertEqual(1, len(service_uuc["allowed_organisations"]))

        service_wiki = self.find_by_name(services, service_wiki_name)
        self.assertEqual(1, service_wiki["organisations_count"])
        self.assertEqual(4, service_wiki["collaborations_count"])

    def test_services_mine(self):
        self.login("urn:service_admin")
        services = self.get("/api/services/mine", with_basic_auth=False)
        self.assertEqual(5, len(services))

        service_storage = self.find_by_name(services, service_storage_name)
        self.assertEqual(0, service_storage["organisations_count"])
        self.assertEqual(1, service_storage["collaborations_count"])

        service_network = self.find_by_name(services, service_network_name)
        self.assertEqual(0, service_network["organisations_count"])
        self.assertEqual(1, service_network["collaborations_count"])

    def test_services_mine_bug(self):
        self.login("urn:jane")
        services = self.get("/api/services/mine", with_basic_auth=False)
        self.assertEqual(0, len(services))

    def test_services_access(self):
        jane = self.find_entity_by_name(User, user_jane_name)
        res = self.get(f"/api/services/v1/access/{jane.id}",
                       headers={"Authorization": f"Bearer {unihard_secret}"},
                       with_basic_auth=False)
        self.assertEqual(2, len(res))

    def test_services_access_forbidden(self):
        roger = self.find_entity_by_name(User, user_roger_name)
        self.get(f"/api/services/v1/access/{roger.id}",
                 headers={"Authorization": f"Bearer {unihard_secret}"},
                 with_basic_auth=False,
                 response_status_code=403)

    def test_services_all_org_member(self):
        self.login("urn:harry")
        services = self.get("/api/services/all", with_basic_auth=False)
        self.assertTrue(len(services) > 0)

    def test_on_request_organisation(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        service_id = service.id
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        organisation_id = organisation.id
        self.assertTrue(organisation in service.automatic_connection_allowed_organisations)
        self.assertFalse(organisation in service.allowed_organisations)

        self.login("urn:john")
        self.put(f"/api/services/on_request_organisation/{service_id}/{organisation_id}", with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_scheduler_name)
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.assertTrue(organisation in service.allowed_organisations)
        self.assertFalse(organisation in service.automatic_connection_allowed_organisations)

    def test_trust_organisation(self):
        service = self.find_entity_by_name(Service, service_mail_name)
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.assertTrue(organisation in service.allowed_organisations)
        self.assertFalse(organisation in service.automatic_connection_allowed_organisations)

        self.login("urn:service_admin")
        self.put(f"/api/services/trust_organisation/{service.id}/{organisation.id}", with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_mail_name)
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.assertFalse(organisation in service.allowed_organisations)
        self.assertTrue(organisation in service.automatic_connection_allowed_organisations)

    def test_disallow_organisation(self):
        service = self.find_entity_by_name(Service, service_wiki_name)
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        organisation.services.append(service)
        self.save_entity(organisation)

        self.assertTrue(organisation in service.allowed_organisations)
        self.assertTrue(organisation in service.automatic_connection_allowed_organisations)

        self.put(f"/api/services/disallow_organisation/{service.id}/{organisation.id}",
                 body={})

        service = self.find_entity_by_name(Service, service_wiki_name)
        self.assertFalse(organisation in service.allowed_organisations)
        self.assertFalse(organisation in service.automatic_connection_allowed_organisations)
        organisation = self.find_entity_by_name(Organisation, unifra_name)
        self.assertFalse(service in organisation.services)

    def test_reset_ldap_password(self):
        service = self._find_by_name()
        res = self.get(f"/api/services/reset_ldap_password/{service['id']}")
        self.assertEqual(32, len(res["ldap_password"]))
        with db.engine.connect() as conn:
            with conn.begin():
                rs = conn.execute(text(f"SELECT ldap_password FROM services WHERE id = {service['id']}"))
        ldap_password = str(next(rs, (0,))[0])
        self.assertTrue(ldap_password.startswith("$2b$"))
        service = self._find_by_name()
        self.assertIsNone(service.get("ldap_password"))

    def test_reset_oidc_client_secret(self):
        service_id = self.find_entity_by_name(Service, service_storage_name).id
        res = self.get(f"/api/services/reset_oidc_client_secret/{service_id}")
        self.assertEqual(32, len(res["oidc_client_secret"]))
        with db.engine.connect() as conn:
            with conn.begin():
                rs = conn.execute(text(f"SELECT oidc_client_secret FROM services WHERE id = {service_id}"))
        oidc_client_secret = str(next(rs, (0,))[0])
        # Ensure we use rounds=5 to prevent performance loss in OIDC-NG
        self.assertTrue(oidc_client_secret.startswith("$2b$05$"))
        # Ensure the oidc_client_secret is not exposed in the API
        service = self.get(f"api/services/{service_id}")
        self.assertIsNone(service.get("oidc_client_secret"))

    def test_service_by_uuid4(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        cloud_uuid4 = cloud.uuid4
        cloud_id = cloud.id

        self.login("urn:peter")
        res = self.get("/api/services/find_by_uuid4", query_data={"uuid4": cloud_uuid4}, with_basic_auth=False)

        self.assertEqual(1, len(res["collaborations"]))
        self.assertEqual(service_cloud_name, res["service"]["name"])
        self.assertEqual("james@example.org", res["service_emails"][str(cloud_id)][0])

    def test_service_by_uuid4_contact_email(self):
        self.login("urn:peter")
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        wiki_id = wiki.id
        res = self.get("/api/services/find_by_uuid4", query_data={"uuid4": wiki.uuid4}, with_basic_auth=False)

        self.assertEqual("help@wiki.com", res["service_emails"][str(wiki_id)][0])

    def test_service_by_uuid4_forbidden(self):
        service_ssh_uva = self.find_entity_by_name(Service, service_ssh_name)
        self.login("urn:peter")
        self.get("/api/services/find_by_uuid4", query_data={"uuid4": service_ssh_uva.uuid4}, with_basic_auth=False,
                 response_status_code=403)

    def test_has_no_member_access_to_service(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        self.login("urn:james")
        has_access = self.get(f"/api/services/member_access_to_service/{cloud.id}", with_basic_auth=False)
        self.assertFalse(has_access)

    def test_has_member_access_to_service(self):
        service_network = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:jane")
        has_access = self.get(f"/api/services/member_access_to_service/{service_network.id}", with_basic_auth=False)
        self.assertTrue(has_access)

    def test_service_delete_request(self):
        self.login("urn:james")
        service_id = self.find_entity_by_name(Service, service_cloud_name).id

        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.delete("/api/services/request_delete", primary_key=service_id)
            self.assertTrue(f"http://localhost:3000/services/{service_id}" in outbox[0].html)

    def test_hint_short_name(self):
        res = self.post("/api/services/hint_short_name", body={"name": "network"}, response_status_code=200)
        self.assertEqual("network2", res["short_name"])

    def test_empty_hint_short_name(self):
        res = self.post("/api/services/hint_short_name", body={"name": "*&^%$$@"}, response_status_code=200)
        self.assertEqual("short_name", res["short_name"])

    def test_toggle_access_allowed_for_services_restricted(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.access_allowed_for_all)
        self.assertFalse(service.allow_restricted_orgs)
        self.assertEqual(2, len(service.allowed_organisations))

        service.automatic_connection_allowed = False
        self.save_entity(service)

        organisation = self.find_entity_by_name(Organisation, umcpekela_name)
        organisation.services_restricted = True
        self.save_entity(organisation)

        self.login("urn:james")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_all": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_all)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertEqual(3, len(service.allowed_organisations))

    def test_service_update_scim_url(self):
        service = self._find_by_name(service_cloud_name)
        self.put(f"/api/services/reset_scim_bearer_token/{service['id']}",
                 {"scim_bearer_token": "secret"})
        rows = db.session.execute(text(f"SELECT scim_bearer_token FROM services where id = {service['id']}"))
        scim_bearer_token = next(rows)[0]
        self.assertIsNotNone(scim_bearer_token)

        service["scim_url"] = "https://changed.com"

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        rows = db.session.execute(text(f"SELECT scim_bearer_token FROM services where id = {service['id']}"))
        new_scim_bearer_token = next(rows)[0]
        self.assertNotEqual(scim_bearer_token, new_scim_bearer_token)

    def test_service_update_scim_secret_exception(self):
        # unset the scim url directly in the database; this should invalidate the scim token
        service = self._find_by_name(service_cloud_name)
        db.session.execute(text(f"UPDATE services SET scim_url=NULL WHERE id = {service['id']}"))
        db.session.commit()

        self.login("urn:john")

        with self.assertLogs() as cm:
            self.put(f"/api/services/reset_scim_bearer_token/{service['id']}",
                     {"scim_bearer_token": "somethingelse"}, response_status_code=400)
            self.assertIn("encrypt_scim_bearer_token for service Cloud requires scim_bearer_token "
                          "(somethingelse) and scim_url (None)", "\n".join(cm.output))

    def test_access_allowed_for_crm_organisation(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_crm_organisation)
        service.non_member_users_access_allowed = True
        service.override_access_allowed_all_connections = True
        self.save_entity(service)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_crm_organisation": False},
                 with_basic_auth=False)
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.non_member_users_access_allowed)
        self.assertFalse(service.override_access_allowed_all_connections)
        self.assertFalse(service.access_allowed_for_crm_organisation)

        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_crm_organisation": True},
                 with_basic_auth=False)
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_crm_organisation)
        self.assertFalse(service.non_member_users_access_allowed)

    def test_access_allowed_for_crm_organisation_not_allowed(self):
        service = self.find_entity_by_name(Service, service_wiki_name)

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"access_allowed_for_crm_organisation": True},
                 with_basic_auth=False,
                 response_status_code=400)

    def test_find_export_overview(self):
        self.login("urn:john")
        services = self.get("/api/services/export-overview", response_status_code=200, with_basic_auth=False)
        self.assertListEqual(sorted(["Cloud", "Storage"]), sorted([s["name"] for s in services]))

    @responses.activate
    def test_sync_external_service(self):
        service = self.find_entity_by_name(Service, service_storage_name)
        with responses.RequestsMock(assert_all_requests_are_fired=True) as res_mock:
            manage_base_url = self.app.app_config.manage.base_url
            manage_base_url = manage_base_url[:-1] if manage_base_url.endswith("/") else manage_base_url
            url = f"{manage_base_url}/manage/api/internal/metadata"
            external_identifier = str(uuid.uuid4())
            res_mock.add(responses.POST, url, json={"id": external_identifier, "version": 0}, status=200)

            res = self.get("/api/services/sync_external_service", query_data={"service_id": service.id},
                           response_status_code=200)
            self.assertTrue(res["export_successful"])

            updated_service = self.find_entity_by_name(Service, service_storage_name)
            self.assertEqual(external_identifier, updated_service.export_external_identifier)
            self.assertEqual(0, updated_service.export_external_version)
            self.assertTrue(updated_service.export_successful)
            self.assertIsNotNone(updated_service.exported_at)
