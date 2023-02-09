import time

from flask import session
from sqlalchemy import text

from server.api.service import user_service
from server.db.db import db
from server.db.domain import Service, Organisation, Collaboration, ServiceInvitation, User
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_network_entity_id, uuc_name, \
    service_network_name, uuc_scheduler_name, service_wiki_name, uva_research_name, service_storage_name, \
    service_cloud_name, service_storage_entity_id, service_ssh_uva_name, tue_name, amsterdam_uva_name, uuc_secret, \
    jane_name, roger_name


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
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        self.login("urn:betty")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_access_allowed_through_organisation_memberships(self):
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        harry = self.find_entity_by_name(User, "Harry Doe")
        with self.app.app_context():
            session["user"] = {"id": harry.id, "uid": harry.uid, "admin": False}
            self.assertTrue(user_service(service.id, False))

    def test_find_by_id_admin(self):
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        logo = self.client.get(f"/api/images/services/{service.uuid4}").data
        self.assertIsNotNone(logo)

        self.login("urn:john")
        service = self.get(f"api/services/{service.id}", with_basic_auth=False)
        self.assertEqual(1, len(service["organisations"]))
        self.assertEqual(2, len(service["service_organisation_collaborations"]))

        logo_data = self.client.get(service["logo"]).data
        self.assertEqual(logo, logo_data)

    def test_find_by_id_service_admin(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.login("urn:james")
        self.get(f"api/services/{service.id}", response_status_code=200, with_basic_auth=False)

    def test_find_by_id_api_call(self):
        service = self.find_entity_by_name(Service, uuc_scheduler_name)
        service = self.get(f"api/services/{service.id}")
        self.assertEqual(0, len(service["ip_networks"]))
        self.assertFalse("logo" in service)

    def test_find_by_entity_id(self):
        res = self.get("api/services/find_by_entity_id", query_data={"entity_id": service_network_entity_id})

        self.assertEqual(res["name"], service_network_name)
        self.assertEqual(uuc_name, res["allowed_organisations"][0]["name"])

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
                "urn:john invited you to become an admin for service new_service" in outbox[0].html)

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
        service = self._find_by_name()
        service["name"] = "changed"
        service["ip_networks"] = [{"network_value": "82.217.86.55/24"}]

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        self.assertEqual("changed", service["name"])
        self.assertEqual(1, len(service["ip_networks"]))

    def test_service_update_delete_service_tokens(self):
        service = self.find_entity_by_name(Service, service_network_name)
        self.login("urn:john")
        service = self.get(f"api/services/{service.id}", with_basic_auth=False)
        self.assertEqual(1, len(service["service_tokens"]))

        service["token_enabled"] = False
        service["pam_web_sso_enabled"] = False

        self.put("/api/services", body=service, with_basic_auth=False)

        service = self._find_by_name(service_network_name)
        self.assertEqual(0, len(service["service_tokens"]))

    def test_toggle_access_allowed_for_all(self):
        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertFalse(service.access_allowed_for_all)

        self.login("urn:james")
        self.put(f"/api/services/toggle_access_allowed_for_all/{service.id}",
                 body={"allowed_for_all": True},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_cloud_name)
        self.assertTrue(service.access_allowed_for_all)

    def test_service_update_do_not_clear_ldap_password(self):
        service = self._find_by_name(service_wiki_name)

        self.login("urn:john")
        service = self.put("/api/services", body=service, with_basic_auth=False)
        rows = db.session.execute(text(f"SELECT ldap_password FROM services where id = {service['id']}"))
        row = next(rows)
        self.assertIsNotNone(row[0])

    def test_service_update_service_admin(self):
        service = self._find_by_name(service_storage_name)
        service["white_listed"] = False
        service["non_member_users_access_allowed"] = True
        service["entity_id"] = "https://changed"

        self.login("urn:service_admin")
        self.put("/api/services", body=service, with_basic_auth=False)
        # assert that forbidden attributes are unchanged
        service = self.find_entity_by_name(Service, service_storage_name)

        self.assertEqual(True, service.white_listed)
        self.assertEqual(False, service.non_member_users_access_allowed)
        self.assertEqual(service_storage_entity_id, service.entity_id)

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

        service_uuc = self.find_by_name(services, uuc_scheduler_name)
        self.assertEqual(1, service_uuc["organisations_count"])
        self.assertEqual(1, len(service_uuc["allowed_organisations"]))

        service_wiki = self.find_by_name(services, service_wiki_name)
        self.assertEqual(1, service_wiki["organisations_count"])
        self.assertEqual(3, service_wiki["collaborations_count"])

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
        jane = self.find_entity_by_name(User, jane_name)
        res = self.get(f"/api/services/v1/access/{jane.id}",
                       headers={"Authorization": f"Bearer {uuc_secret}"},
                       with_basic_auth=False)
        self.assertEqual(4, len(res))

    def test_services_access_forbidden(self):
        roger = self.find_entity_by_name(User, roger_name)
        self.get(f"/api/services/v1/access/{roger.id}",
                 headers={"Authorization": f"Bearer {uuc_secret}"},
                 with_basic_auth=False,
                 response_status_code=403)

    def test_services_all_org_member(self):
        self.login("urn:harry")
        services = self.get("/api/services/all", with_basic_auth=False)
        self.assertTrue(len(services) > 0)

    def test_add_allowed_organisations(self):
        service = self.find_entity_by_name(Service, service_wiki_name)
        self.assertEqual(2, len(service.allowed_organisations))
        self.assertEqual(1, len(service.automatic_connection_allowed_organisations))

        ucc = self.find_entity_by_name(Organisation, uuc_name)
        tue = self.find_entity_by_name(Organisation, tue_name)
        self.login("urn:service_admin")
        self.put(f"/api/services/allowed_organisations/{service.id}",
                 body={"allowed_organisations": [{"organisation_id": ucc.id}, {"organisation_id": tue.id}]},
                 with_basic_auth=False)

        service = self.find_entity_by_name(Service, service_wiki_name)
        org_names = list(sorted([org.name for org in service.allowed_organisations]))
        self.assertListEqual([tue_name, uuc_name], org_names)
        self.assertEqual(0, len(service.automatic_connection_allowed_organisations))

    def test_add_allowed_organisations_none(self):
        coll = self.find_entity_by_name(Collaboration, uva_research_name)
        pre = len(coll.services)
        service = self.find_entity_by_name(Service, service_wiki_name)
        self.put(f"/api/services/allowed_organisations/{service.id}",
                 body={"allowed_organisations": []})

        coll = self.find_entity_by_name(Collaboration, uva_research_name)
        post = len(coll.services)
        self.assertEqual(pre - 1, post)

    def test_reset_ldap_password(self):
        service = self._find_by_name()
        res = self.get(f"/api/services/reset_ldap_password/{service['id']}")
        self.assertEqual(32, len(res["ldap_password"]))
        rs = db.engine.execute(f"SELECT ldap_password FROM services WHERE id = {service['id']}")
        ldap_password = next(rs, (0,))[0]
        self.assertTrue(ldap_password.startswith("$6$rounds=100000$"))
        service = self._find_by_name()
        self.assertIsNone(service.get("ldap_password"))

    def test_service_by_uuid4(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        self.login("urn:peter")
        res = self.get("/api/services/find_by_uuid4", query_data={"uuid4": cloud.uuid4}, with_basic_auth=False)

        self.assertEqual(1, len(res["collaborations"]))
        self.assertEqual(cloud.name, res["service"]["name"])
        self.assertEqual("james@example.org", res["service_emails"][str(cloud.id)][0])

    def test_service_by_uuid4_contact_email(self):
        wiki = self.find_entity_by_name(Service, service_wiki_name)
        self.login("urn:peter")
        res = self.get("/api/services/find_by_uuid4", query_data={"uuid4": wiki.uuid4}, with_basic_auth=False)

        self.assertEqual("help@wiki.com", res["service_emails"][str(wiki.id)][0])

    def test_service_by_uuid4_forbidden(self):
        cloud = self.find_entity_by_name(Service, service_ssh_uva_name)
        self.login("urn:peter")
        self.get("/api/services/find_by_uuid4", query_data={"uuid4": cloud.uuid4}, with_basic_auth=False,
                 response_status_code=403)

    def test_service_update_clear_automatic_connection_allowed_organisations(self):
        service_from_db = self.find_entity_by_name(Service, service_wiki_name)

        # Required to get the details
        self.login("urn:service_admin")
        service = self.get(f"api/services/{service_from_db.id}")
        self.assertEqual(1, len(service["automatic_connection_allowed_organisations"]))
        self.assertFalse(service["automatic_connection_allowed"])

        service["automatic_connection_allowed"] = True
        service["automatic_connection_allowed_organisations"] = \
            [{"value": org.id} for org in service_from_db.automatic_connection_allowed_organisations]
        self.put("/api/services", body=service, with_basic_auth=False)

        service_from_db = self.find_entity_by_name(Service, service_wiki_name)
        self.assertEqual(0, len(service_from_db.automatic_connection_allowed_organisations))
        self.assertTrue(service_from_db.automatic_connection_allowed)

    def test_service_update_change_automatic_connection_allowed_organisations(self):
        service_from_db = self.find_entity_by_name(Service, service_wiki_name)

        # Required to get the details
        self.login("urn:service_admin")
        service = self.get(f"api/services/{service_from_db.id}")

        service["automatic_connection_allowed_organisations"] = [
            {"value": self.find_entity_by_name(Organisation, tue_name).id},
            {"value": self.find_entity_by_name(Organisation, amsterdam_uva_name).id},
        ]
        self.put("/api/services", body=service, with_basic_auth=False)

        service_from_db = self.find_entity_by_name(Service, service_wiki_name)
        organisations = service_from_db.automatic_connection_allowed_organisations
        self.assertEqual(2, len(organisations))
        org_names = list(sorted([org.name for org in organisations]))
        self.assertListEqual([amsterdam_uva_name, tue_name], org_names)
