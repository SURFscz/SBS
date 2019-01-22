from server.db.db import Organisation
from server.test.abstract_test import AbstractTest
from server.test.seed import uuc_name


class TestOrganisation(AbstractTest):

    def test_search(self):
        organisations = self.get("/api/organisations/search", query_data={"q": "urba"})
        self.assertEqual(1, len(organisations))

    def test_my_organisations(self):
        self.login()
        organisations = self.get("/api/organisations")
        self.assertEqual(1, len(organisations))
        organisation = AbstractTest.find_by_name(organisations, uuc_name)
        self.assertEqual("urn:john", organisation["organisation_memberships"][0]["user"]["uid"])

    def test_organisation_by_id(self):
        self.login()
        organisation = self.get(f"/api/organisations/{Organisation.query.all()[0].id}")
        self.assertEqual(1, len(organisation["organisation_memberships"]))

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
