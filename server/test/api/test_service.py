import time

from flask import session
from sqlalchemy import text

from server.api.service import user_service
from server.db.db import db
from server.db.domain import Service, Organisation, ServiceInvitation, User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_network_entity_id, unihard_name, \
    service_network_name, service_scheduler_name, service_wiki_name, service_storage_name, \
    service_cloud_name, service_storage_entity_id, service_ssh_name, unifra_name, unihard_secret, \
    user_jane_name, user_roger_name, service_sram_demo_sp, umcpekela_name


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
        self.assertEqual(1, len(service["organisations"]))
        self.assertEqual(3, len(service["service_organisation_collaborations"]))

        logo_data = self.client.get(service["logo"]).data
        self.assertEqual(logo, logo_data)

    def test_find_by_id_service_admin(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.login("urn:james")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_api_call(self):
        service = self.find_entity_by_name(Service, service_scheduler_name)
        service = self.get(f"api/services/{service.id}")
        self.assertEqual(0, len(service["ip_networks"]))
        self.assertFalse("logo" in service)

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
                "entity_id": "https://new_service",
                "name": "new_service",
                "token_validity_days": "",
                "privacy_policy": "https://privacy.com",
                "administrators": ["the@ex.org"],
                "abbreviation": "12qw$%OOOKaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "ip_networks": [{"network_value": "2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128"},
                                {"network_value": "82.217.86.55/24"}]
            })

            self.assertTrue(
                "John Doe invited you to become an admin for service new_service" in outbox[0].html)

            self.assertIsNotNone(service["id"])
            self.assertEqual("new_service", service["name"])
            self.assertEqual("qwoookaaaaaaaaaa", service["abbreviation"])
            self.assertEqual(2, len(service["ip_networks"]))
            self.assertEqual("2001:1c02:2b2f:be00:1cf0:fd5a:a548:1a16/128", service["ip_networks"][0]["network_value"])

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
                "expiry_date": int(time.time())
            })
            post_count = ServiceInvitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)
            invitation = ServiceInvitation.query.filter(ServiceInvitation.invitee_email == "new@example.org").first()
            self.assertEqual("admin", invitation.intended_role)
            self.assertIsNotNone(invitation.expiry_date)

    def test_service_update(self):
        service = self._find_by_name(service_cloud_name)
        service["name"] = "changed"
        service["ip_networks"] = [{"network_value": "82.217.86.55/24"}]
        service["ldap_enabled"] = False

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        self.assertEqual("changed", service["name"])
        self.assertEqual(1, len(service["ip_networks"]))
        rows = db.session.execute(text(f"SELECT ldap_password FROM services where id = {service['id']}"))
        row = next(rows)
        self.assertIsNone(row[0])

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
        self.assertEqual(3, len(service.allowed_organisations))

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

        self.login("urn:john")
        self.put(f"/api/services/toggle_access_property/{service.id}",
                 body={"non_member_users_access_allowed": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.non_member_users_access_allowed)

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
        self.assertEqual(service_storage_entity_id, service.entity_id)
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
        self.assertTrue("ip_networks" in service_mail)
        self.assertFalse("collaborations_count" in service_mail)
        self.assertFalse("organisations_count" in service_mail)

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
        self.assertEqual(4, len(services))

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
        self.assertEqual(4, len(res))

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
        ldap_password = next(rs, (0,))[0]
        self.assertTrue(ldap_password.startswith("$2b$12$"))
        service = self._find_by_name()
        self.assertIsNone(service.get("ldap_password"))

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
        self.assertEqual(2, len(service.allowed_organisations))
