# -*- coding: future_fstrings -*-

from server.db.domain import Organisation, OrganisationInvitation
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER
from server.test.seed import uuc_name, schac_home_organisation, amsterdam_uva_name, schac_home_organisation_uuc


class TestOrganisation(AbstractTest):

    def test_search(self):
        organisations = self.get("/api/organisations/search", query_data={"q": "urba"})
        self.assertEqual(1, len(organisations))

    def test_search_wildcard(self):
        res = self.get("/api/organisations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_search_allowed(self):
        self.login("urn:john")
        organisations = self.get("/api/organisations/search", query_data={"q": "urba"}, with_basic_auth=False,
                                 headers={"X-IMPERSONATE-ID": 1, "X-IMPERSONATE-UID": "urn:mary",
                                          "X-IMPERSONATE-NAME": "mary", "X-IMPERSONATE-EMAIL": "email"})
        self.assertEqual(1, len(organisations))

    def test_search_not_allowed(self):
        self.get("/api/organisations/search", query_data={"q": "urba"}, with_basic_auth=False, response_status_code=401)

    def test_my_organisations(self):
        self.login()
        organisations = self.get("/api/organisations")
        self.assertEqual(1, len(organisations))
        organisation = AbstractTest.find_by_name(organisations, uuc_name)
        self.assertEqual("urn:john", organisation["organisation_memberships"][0]["user"]["uid"])

    def test_organisations_all(self):
        organisations = self.get("/api/organisations/all",
                                 headers=API_AUTH_HEADER,
                                 with_basic_auth=False)
        self.assertEqual(2, len(organisations))
        organisation = organisations[0]
        self.assertFalse("collaborations_count" in organisation)
        self.assertFalse("organisation_memberships_count" in organisation)

    def test_organisations_all_include_counts(self):
        organisations = self.get("/api/organisations/all",
                                 query_data={"include_counts": True},
                                 headers=API_AUTH_HEADER,
                                 with_basic_auth=False)
        self.assertEqual(2, len(organisations))

        organisation = organisations[0]
        self.assertEqual(2, organisation["collaborations_count"])
        self.assertEqual(3, organisation["organisation_memberships_count"])

    def test_organisations_by_schac_home_organisation(self):
        self.login("urn:roger", schac_home_organisation)
        organisations = self.get("/api/organisations/find_by_schac_home_organisation",
                                 with_basic_auth=False)
        self.assertEqual(1, len(organisations))

    def test_organisations_by_schac_home_organisation_none(self):
        self.login("urn:harry")
        organisations = self.get("/api/organisations/find_by_schac_home_organisation",
                                 with_basic_auth=False)
        self.assertEqual(0, len(organisations))

    def test_organisations_by_schac_home_organisation_not_present(self):
        self.login("urn:peter")
        organisations = self.get("/api/organisations/find_by_schac_home_organisation",
                                 with_basic_auth=False)
        self.assertEqual(0, len(organisations))

    def test_organisation_by_id_with_api_user(self):
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}",
                                headers=API_AUTH_HEADER,
                                with_basic_auth=False)
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)
        self.assertTrue(len(organisation["api_keys"]) > 0)

    def test_organisation_by_id(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_by_id_manager(self):
        self.login("urn:harry")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_by_id_404(self):
        self.login("urn:sarah")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        self.get(f"/api/organisations/{organisation_id}", response_status_code=404)

    def test_my_organisation_by_id_lite_(self):
        self.login("urn:sarah")
        organisation_id = self.find_entity_by_name(Organisation, amsterdam_uva_name).id
        res = self.get(f"/api/organisations/lite/{organisation_id}")
        self.assertEqual(amsterdam_uva_name, res["name"])

    def test_my_organisation_by_id_lite_forbidden(self):
        self.login("urn:admin")
        organisation_id = self.find_entity_by_name(Organisation, amsterdam_uva_name).id
        self.get(f"/api/organisations/lite/{organisation_id}", response_status_code=403)

    def test_organisation_services(self):
        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/services/{organisation_id}")
        self.assertEqual(1, len(organisation["services"]))

    def test_organisation_crud(self):
        self.login()
        organisation = self.post("/api/organisations", body={"name": "new_organisation",
                                                             "short_name": "https://ti1"},
                                 with_basic_auth=False)
        self.assertIsNotNone(organisation["id"])
        self.assertEqual("new_organisation", organisation["name"])
        self.assertEqual(3, Organisation.query.count())

        organisation["name"] = "changed"
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["name"])

        self.delete("/api/organisations", primary_key=organisation["id"])
        self.assertEqual(2, Organisation.query.count())

    def test_organisation_update_short_name(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}", with_basic_auth=False)
        organisation["short_name"] = "changed!!!!"
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["short_name"])

        collaborations = self.find_entity_by_name(Organisation, uuc_name).collaborations
        for collaboration in collaborations:
            self.assertTrue("changed" in collaboration.global_urn)
            for group in collaboration.groups:
                self.assertTrue("changed" in group.global_urn)

    def test_organisation_forbidden(self):
        self.login("urn:peter")
        self.post("/api/organisations", with_basic_auth=False,
                  body={"name": "new_organisation",
                        "short_name": "https://ti2"},
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

    def test_organisation_short_name_exists(self):
        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": uuc_name})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": uuc_name,
                                                                           "existing_organisation": uuc_name})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": "xyc",
                                                                           "existing_organisation": "xyc"})
        self.assertEqual(False, res)

    def test_organisation_schac_home_exists(self):
        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": schac_home_organisation_uuc})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/schac_home_exists",
                       query_data={"schac_home": schac_home_organisation_uuc,
                                   "existing_organisation": schac_home_organisation_uuc})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": "xyc",
                                                                           "existing_organisation": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": ""})
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
                            "intended_role": "manager",
                            "short_name": "https://ti1"},
                      with_basic_auth=False)
            self.assertEqual(2, len(outbox))
            post_count = OrganisationInvitation.query.count()
            self.assertEqual(pre_count + 2, post_count)

        memberships = self.find_entity_by_name(Organisation, "new_organisation").organisation_memberships
        self.assertEqual(0, len(memberships))

    def test_organisation_invites_preview(self):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        res = self.post("/api/organisations/invites-preview", body={
            "organisation_id": organisation_id
        })
        self.assertFalse("Personal" in res["html"])

    def test_organisation_invites_preview_personal_message(self):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        res = self.post("/api/organisations/invites-preview", body={
            "organisation_id": organisation_id,
            "message": "Please join"
        })
        self.assertTrue("Personal" in res["html"])
        self.assertTrue("Please join" in res["html"])

    def test_organisation_no_api_keys_cascade(self):
        self.login()
        secret = self.get("/api/api_keys")["value"]

        organisation = self.post("/api/organisations",
                                 body={"name": "new_organisation",
                                       "short_name": "https://ti1",
                                       "api_keys": [
                                           {"hashed_secret": secret}
                                       ]},
                                 with_basic_auth=False)
        organisation = self.get(f"/api/organisations/{organisation['id']}")

        self.assertEqual([], organisation["api_keys"])
        organisation["api_keys"] = [{"hashed_secret": secret}]
        organisation = self.put("/api/organisations", body=organisation)

        organisation = self.get(f"/api/organisations/{organisation['id']}")
        self.assertEqual([], organisation["api_keys"])
