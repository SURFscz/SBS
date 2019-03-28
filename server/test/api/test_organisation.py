from base64 import b64encode

from server.db.db import Organisation, OrganisationInvitation
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestOrganisation(AbstractTest):

    def test_search(self):
        organisations = self.get("/api/organisations/search", query_data={"q": "urba"})
        self.assertEqual(1, len(organisations))

    def test_search_wildcard(self):
        res = self.get("/api/organisations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_my_organisations(self):
        self.login()
        organisations = self.get("/api/organisations")
        self.assertEqual(1, len(organisations))
        organisation = AbstractTest.find_by_name(organisations, uuc_name)
        self.assertEqual("urn:john", organisation["organisation_memberships"][0]["user"]["uid"])

    def test_organisations_all(self):
        organisations = self.get("/api/organisations/all",
                                 headers={"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"},
                                 with_basic_auth=False)
        self.assertEqual(2, len(organisations))

    def test_organisation_by_id_with_api_user(self):
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}",
                                 headers={"Authorization": f"Basic {b64encode(b'sysread:secret').decode('ascii')}"},
                                 with_basic_auth=False)
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_by_id(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_crud(self):
        self.login()
        organisation = self.post("/api/organisations", body={"name": "new_organisation",
                                                             "tenant_identifier": "https://ti1"},
                                 with_basic_auth=False)
        self.assertIsNotNone(organisation["id"])
        self.assertEqual("new_organisation", organisation["name"])
        self.assertEqual(3, Organisation.query.count())

        organisation["name"] = "changed"
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["name"])

        self.delete("/api/organisations", primary_key=organisation["id"])
        self.assertEqual(2, Organisation.query.count())

    def test_organisation_forbidden(self):
        self.login("urn:peter")
        self.post("/api/organisations", with_basic_auth=False,
                  body={"name": "new_organisation",
                        "tenant_identifier": "https://ti2"},
                  response_status_code=403)

    def test_organisation_name_exists(self):
        res = self.get("/api/organisations/name_exists", query_data={"name": "uuc"})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/name_exists", query_data={"name": "uuc", "existing_organisation": "uuc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/name_exists", query_data={"name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/name_exists", query_data={"name": "xyc", "existing_organisation": "xyc"})
        self.assertEqual(False, res)

    def test_organisation_identifier_exists(self):
        res = self.get("/api/organisations/identifier_exists", query_data={"identifier": "https://uuc"})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/identifier_exists",
                       query_data={"identifier": "https://uuc", "existing_organisation": "HTTPS://UUC"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/identifier_exists", query_data={"identifier": "https://xyz"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/identifier_exists",
                       query_data={"identifier": "https://xyz", "existing_organisation": "https://xyz"})
        self.assertEqual(False, res)

    def test_my_organisations_lite_super_user(self):
        self.login("urn:john")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(2, len(res))

    def test_my_organisations_lite_admin(self):
        self.login("urn:mary")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(1, len(res))

    def test_my_organisations_lite_no_admin(self):
        self.login("urn:james")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(0, len(res))

    def test_organisation_by_id_no_admin(self):
        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_update_admin(self):
        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")

        organisation["name"] = "changed"
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["name"])

    def test_organisation_invites(self):
        pre_count = OrganisationInvitation.query.count()
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/organisations/invites", body={
                "organisation_id": organisation_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join"
            })
            post_count = OrganisationInvitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertEqual(pre_count + 2, post_count)

    def test_organisation_save_with_invites(self):
        pre_count = OrganisationInvitation.query.count()
        self.login("urn:john")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.post("/api/organisations",
                      body={"name": "new_organisation",
                            "administrators": ["new@example.org", "pop@example.org"],
                            "tenant_identifier": "https://ti1"},
                      with_basic_auth=False)
            self.assertEqual(2, len(outbox))
            post_count = OrganisationInvitation.query.count()
            self.assertEqual(pre_count + 2, post_count)
