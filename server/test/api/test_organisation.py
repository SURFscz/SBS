import os

from server.cron import idp_metadata_parser
from server.cron.idp_metadata_parser import idp_metadata_file
from server.db.db import db
from server.db.domain import Organisation, OrganisationInvitation, User, JoinRequest, OrganisationMembership, ApiKey
from server.test.abstract_test import AbstractTest, API_AUTH_HEADER
from server.test.seed import (unihard_name, unifra_name, schac_home_organisation_unihar,
                              schac_home_organisation_example,
                              read_image, user_jane_name, unihard_short_name, unihard_unit_support_name,
                              co_ai_computing_name, unifra_secret, co_research_name,
                              group_science_name, unihard_secret_unit_support, unihard_hashed_secret_unit_support)


class TestOrganisation(AbstractTest):

    def _reset_idp(self):
        if os.path.isfile(idp_metadata_file):
            os.remove(idp_metadata_file)

        idp_metadata_parser.idp_metadata = None

    def test_search(self):
        organisations = self.get("/api/organisations/search", query_data={"q": "urba"})
        self.assertEqual(1, len(organisations))

    def test_search_wildcard(self):
        res = self.get("/api/organisations/search", query_data={"q": "*"})
        self.assertTrue(len(res) > 0)

    def test_search_allowed_by_service_admin(self):
        self.login("urn:service_admin")
        res = self.get("/api/organisations/search", query_data={"q": "*"}, with_basic_auth=False)
        self.assertTrue(len(res) > 0)

    def test_search_not_allowed(self):
        self.get("/api/organisations/search", query_data={"q": "urba"}, with_basic_auth=False, response_status_code=401)

    def test_my_organisations(self):
        self.login()
        organisations = self.get("/api/organisations")

        self.assertTrue("collaborations_count" in organisations[0])
        self.assertTrue("organisation_memberships_count" in organisations[0])

    def test_organisations_all(self):
        organisations = self.get("/api/organisations/all",
                                 headers=API_AUTH_HEADER,
                                 with_basic_auth=False)
        self.assertEqual(4, len(organisations))

        organisation = organisations[0]
        self.assertEqual(3, organisation["collaborations_count"])
        self.assertEqual(4, organisation["organisation_memberships_count"])

    def test_identity_provider_display_name(self):
        self._reset_idp()

        self.login("urn:roger", "uni-franeker.nl")
        res = self.get("/api/organisations/identity_provider_display_name",
                       with_basic_auth=False)
        self.assertEqual("Academy of Franeker", res["display_name"])

    def test_identity_provider_display_name_other(self):
        self._reset_idp()

        self.login("urn:john")
        user = User.query.filter(User.uid == "urn:james").one()
        res = self.get("/api/organisations/identity_provider_display_name",
                       query_data={"user_id": user.id, "lang": "nl"},
                       with_basic_auth=False)
        self.assertEqual(unihard_name, res["display_name"])

    def test_identity_provider_display_name_no_schac_home(self):
        self._reset_idp()

        self.login("urn:harry")
        res = self.get("/api/organisations/identity_provider_display_name",
                       with_basic_auth=False)
        self.assertIsNone(res)

    def test_organisations_by_schac_home_organisation(self):
        self.login("urn:roger", schac_home_organisation_example)
        organisation = self.get("/api/organisations/find_by_schac_home_organisation",
                                with_basic_auth=False)[0]
        self.assertEqual(False, organisation["collaboration_creation_allowed"])
        self.assertEqual(False, organisation["collaboration_creation_allowed_entitlement"])
        self.assertEqual(True, organisation["has_members"])
        self.assertEqual(unifra_name, organisation["name"])

    def test_organisations_by_schac_home_organisation_subdomain(self):
        roger = User.query.filter(User.uid == "urn:roger").first()
        roger.schac_home_organisation = f"subdomain.{schac_home_organisation_example}"
        db.session.merge(roger)

        self.login("urn:roger", schac_home_organisation_example)
        organisation = self.get("/api/organisations/find_by_schac_home_organisation",
                                with_basic_auth=False)[0]
        self.assertEqual(unifra_name, organisation["name"])
        self.assertListEqual(["example.org"], organisation["schac_home_organisations"])

    def test_organisations_by_schac_home_organisation_none(self):
        self.login("urn:harry")
        organisations = self.get("/api/organisations/find_by_schac_home_organisation",
                                 with_basic_auth=False)
        self.assertEqual(0, len(organisations))

    def test_organisations_by_schac_home_organisation_not_present(self):
        self.login("urn:admin")
        organisations = self.get("/api/organisations/find_by_schac_home_organisation",
                                 with_basic_auth=False)
        self.assertEqual(0, len(organisations))

    def test_organisation_by_id_with_api_user(self):
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}",
                                headers=API_AUTH_HEADER,
                                with_basic_auth=False)
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)
        self.assertTrue(len(organisation["api_keys"]) > 0)

    def test_schac_home(self):
        self.login("urn:betty")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        name = self.get(f"/api/organisations/schac_home/{organisation_id}", with_basic_auth=False)
        self.assertEqual(schac_home_organisation_unihar, name)

    def test_schac_homes(self):
        self.login("urn:betty")
        body = [{"organisation_id": jr.collaboration.organisation_id, "join_request_id": jr.id} for jr in
                JoinRequest.query.all()]
        names = self.post("/api/organisations/schac_homes/", body=body, with_basic_auth=False)
        self.assertEqual(4, len(names))

    def test_names(self):
        self.login("urn:betty")
        body = [{"organisation_id": jr.collaboration.organisation_id, "join_request_id": jr.id} for jr in
                JoinRequest.query.all()]
        names = self.post("/api/organisations/names/", body=body, with_basic_auth=False)
        self.assertEqual(4, len(names))

    def test_crm_organisations(self):
        self.login("urn:john")
        crm_organisations = self.get("/api/organisations/crm_organisations", with_basic_auth=False)
        self.assertEqual(2, len(crm_organisations))
        self.assertIsNotNone(crm_organisations[0]["crm_id"])

    def test_organisation_by_id(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)
        self.assertTrue("invitations_count" in organisation["collaborations"][0])
        self.assertTrue("collaboration_memberships_count" in organisation["collaborations"][0])

    def test_organisation_by_id_manager(self):
        self.login("urn:harry")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)
        self.assertEqual(1, len(organisation["collaborations"]))

    def test_organisation_by_id_manager_restricted_collaborations(self):
        self.login("urn:paul")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        # Paul has a organisation membership with a unit, that is not used by any collaboration
        self.assertEqual(1, len(organisation["collaborations"]))

    def test_organisation_by_id_404(self):
        self.login("urn:sarah")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        self.get(f"/api/organisations/{organisation_id}", response_status_code=404)

    def test_organisation_crud(self):
        self.login()
        organisation = self.post("/api/organisations",
                                 body={"name": "new_organisation",
                                       "schac_home_organisations": [
                                           {"name": "new_schac_home.org"},
                                           {"name": "new_schac_home.com"},
                                       ],
                                       "short_name": "https://ti1"},
                                 with_basic_auth=False)
        self.assertIsNotNone(organisation["id"])
        self.assertEqual("new_organisation", organisation["name"])
        self.assertEqual(5, Organisation.query.count())

        new_organisation = self.find_entity_by_name(Organisation, "new_organisation")
        self.assertEqual(2, len(new_organisation.schac_home_organisations))

        organisation["name"] = "changed"
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["name"])

        self.delete("/api/organisations", primary_key=organisation["id"])
        self.assertEqual(4, Organisation.query.count())

    def test_organisation_update_short_name(self):
        self.mark_organisation_service_restricted(unihard_name)
        self.login("urn:mary")
        organisation_uuc = self.find_entity_by_name(Organisation, unihard_name)
        organisation_id = organisation_uuc.id

        organisation = self.get(f"/api/organisations/{organisation_id}", with_basic_auth=False)
        organisation["short_name"] = "changed!!!!"
        organisation["services_restricted"] = False
        organisation["service_connection_requires_approval"] = True
        organisation = self.put("/api/organisations", body=organisation)
        self.assertEqual("changed", organisation["short_name"])
        self.assertTrue(organisation["services_restricted"])
        self.assertFalse(organisation["service_connection_requires_approval"])

        collaborations = self.find_entity_by_name(Organisation, unihard_name).collaborations

        for collaboration in collaborations:
            self.assertTrue("changed" in collaboration.global_urn)
            for group in collaboration.groups:
                self.assertTrue("changed" in group.global_urn)

    def test_organisation_update_schac_home(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}", with_basic_auth=False)
        orig_sho = organisation["schac_home_organisations"][0]["name"]

        organisation["schac_home_organisations"] = [
            {"name": "rug.nl"},  # new
            {"name": orig_sho}  # identical to before
        ]
        self.put("/api/organisations", body=organisation)

        organisation = self.find_entity_by_name(Organisation, unihard_name)
        self.assertEqual(2, len(organisation.schac_home_organisations))
        self.assertSetEqual(set(["rug.nl", orig_sho]), set([sho.name for sho in organisation.schac_home_organisations]))

    def test_organisation_update_units(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}", with_basic_auth=False)
        units = organisation["units"]

        units[0]["name"] = "changed"  # change name of first unit
        del units[1]["id"]  # remove id of second unit, so it will be added with an identical name (should be discarded)
        units.append({"name": "extra"})  # add a new unit

        self.put("/api/organisations", body=organisation)

        organisation = self.find_entity_by_name(Organisation, unihard_name)
        self.assertEqual(3, len(organisation.units))
        self.assertSetEqual(set(["changed", unihard_unit_support_name, "extra"]),
                            set([unit.name for unit in organisation.units]))

    def test_organisation_forbidden(self):
        self.login("urn:peter")
        self.post("/api/organisations", with_basic_auth=False,
                  body={"name": "new_organisation",
                        "short_name": "https://ti2"},
                  response_status_code=403)

    def test_organisation_name_exists(self):
        res = self.get("/api/organisations/name_exists", query_data={"name": unihard_name})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/name_exists",
                       query_data={"name": unihard_name, "existing_organisation": unihard_name})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/name_exists", query_data={"name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/name_exists",
                       query_data={"name": "xyc", "existing_organisation": "xyc"})
        self.assertEqual(False, res)

    def test_organisation_short_name_exists(self):
        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": unihard_short_name})
        self.assertEqual(True, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": unihard_short_name,
                                                                           "existing_organisation": unihard_short_name})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/short_name_exists", query_data={"short_name": "xyc",
                                                                           "existing_organisation": "xyc"})
        self.assertEqual(False, res)

    def test_organisation_schac_home_exists(self):
        res = self.get("/api/organisations/schac_home_exists",
                       query_data={"schac_home": schac_home_organisation_unihar})
        self.assertEqual(schac_home_organisation_unihar, res)

        uuc_id = self.find_entity_by_name(Organisation, unihard_name).id

        res = self.get("/api/organisations/schac_home_exists",
                       query_data={"schac_home": schac_home_organisation_unihar,
                                   "existing_organisation_id": uuc_id})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": "xyc"})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": "xyc",
                                                                           "existing_organisation_id": uuc_id})
        self.assertEqual(False, res)

        res = self.get("/api/organisations/schac_home_exists", query_data={"schac_home": ""})
        self.assertEqual(False, res)

    def test_my_organisations_lite_super_user(self):
        self.login("urn:john")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(4, len(res))

    def test_my_organisations_lite_admin(self):
        self.login("urn:mary")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(2, len(res))

    def test_my_organisations_lite_no_admin(self):
        self.login("urn:james")
        res = self.get("/api/organisations/mine_lite")
        self.assertEqual(0, len(res))

    def test_organisation_by_id_no_admin(self):
        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertTrue(len(organisation["organisation_memberships"]) > 0)

    def test_organisation_by_id_manager_without_units(self):
        mary_admin = OrganisationMembership.query \
            .join(OrganisationMembership.user) \
            .join(OrganisationMembership.organisation) \
            .filter(Organisation.name == unihard_name) \
            .filter(User.uid == "urn:mary") \
            .one()
        mary_admin.role = "manager"
        self.save_entity(mary_admin)

        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        self.assertEqual(3, len(organisation["collaborations"]))

    def test_organisation_update_admin(self):
        self.login("urn:mary")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}")
        uuid4_value = organisation["uuid4"]

        organisation["name"] = "changed"
        organisation["logo"] = read_image("storage.png")
        organisation = self.put("/api/organisations", body=organisation)

        new_uuid4_value = organisation["uuid4"]
        self.assertNotEqual(uuid4_value, new_uuid4_value)
        self.assertEqual("changed", organisation["name"])

    def test_organisation_invites(self):
        pre_count = OrganisationInvitation.query.count()
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.put("/api/organisations/invites", body={
                "organisation_id": organisation_id,
                "administrators": ["new@example.org", "pop@example.org"],
                "message": "Please join"
            })
            post_count = OrganisationInvitation.query.count()
            self.assertEqual(2, len(outbox))
            self.assertTrue(
                f"You have been invited by John Doe to become manager in organisation '{unihard_name}'" in outbox[
                    0].html)
            self.assertEqual(pre_count + 2, post_count)

    def test_organisation_invites_with_bogus_intended_role(self):
        self.login("urn:john")
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        units = [{"name": unit.name, "id": unit.id} for unit in organisation.units]
        organisation_id = organisation.id
        self.put("/api/organisations/invites", body={
            "organisation_id": organisation_id,
            "units": units,
            "administrators": ["new@example.org"],
            "intended_role": "bogus"
        })
        invitation = OrganisationInvitation.query \
            .filter(OrganisationInvitation.invitee_email == "new@example.org").first()
        self.assertEqual("manager", invitation.intended_role)
        self.assertEqual(2, len(invitation.units))

    def test_organisation_duplicate_invites(self):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        email = "roger@example.org"
        res = self.put("/api/organisations/invites",
                       body={"organisation_id": organisation_id, "administrators": [email], "message": "Please join"},
                       response_status_code=400)
        self.assertTrue(email in res["message"])

    def test_organisation_save_with_invites(self):
        pre_count = OrganisationInvitation.query.count()
        self.login("urn:john")
        mail = self.app.mail
        with mail.record_messages() as outbox:
            self.post("/api/organisations",
                      body={"name": "new_organisation",
                            "administrators": ["new@example.org", "pop@example.org"],
                            "intended_role": "manager",
                            "units": [{"name": "support"}, {"name": "research"}],
                            "short_name": "https://ti1"},
                      with_basic_auth=False)
            self.assertTrue(len(outbox) >= 2)
            post_count = OrganisationInvitation.query.count()
            self.assertEqual(pre_count + 2, post_count)

        organisation = self.find_entity_by_name(Organisation, "new_organisation")
        self.assertEqual(0, len(organisation.organisation_memberships))
        self.assertEqual(2, len(organisation.units))

    def test_organisation_invites_preview(self):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        res = self.post("/api/organisations/invites-preview", body={
            "organisation_id": organisation_id
        })
        self.assertFalse("Personal" in res["html"])

    def test_organisation_invites_preview_personal_message(self):
        self.login("urn:john")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        res = self.post("/api/organisations/invites-preview", body={
            "organisation_id": organisation_id,
            "message": "Please join"
        })
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

    def test_find_api(self):
        res = self.get("/api/organisations/v1",
                       headers={"Authorization": f"Bearer {unifra_secret}"},
                       with_basic_auth=False)
        collaborations = res["collaborations"]
        self.assertEqual(2, len(collaborations))
        collaboration = [c for c in collaborations if c["name"] == co_research_name][0]
        self.assertEqual(4, len(collaboration["collaboration_memberships"]))
        self.assertTrue("user" in collaboration["collaboration_memberships"][0])
        group = [g for g in collaboration["groups"] if g["name"] == group_science_name][0]
        self.assertEqual(1, len(group["collaboration_memberships"]))
        self.assertTrue(isinstance(group["collaboration_memberships"][0], int))

    def test_find_api_unit_access(self):
        res = self.get("/api/organisations/v1",
                       headers={"Authorization": f"Bearer {unihard_secret_unit_support}"},
                       with_basic_auth=False)
        collaborations = res["collaborations"]
        self.assertEqual(1, len(collaborations))
        self.assertEqual(1, res["collaborations_count"])
        collaboration = collaborations[0]
        self.assertEqual(co_ai_computing_name, collaboration["name"])
        # Test logic that determined the filtering of CO's with no units or other units than the used ApiKey
        api_key = ApiKey.query.filter(ApiKey.hashed_secret == unihard_hashed_secret_unit_support).one()
        self.assertEqual(1, len(api_key.units))
        self.assertEqual(1, len(collaboration["units"]))
        self.assertEqual(collaboration["units"][0], api_key.units[0].name)
        users = [cm.get("user") for cm in collaboration.get("collaboration_memberships")]
        self.assertEqual(5, len(users))
        for user in users:
            self.assertFalse("mfa_reset_token" in user)
            self.assertTrue(isinstance(user.get("second_factor_auth"), bool))

    def test_search_users(self):
        self.login("urn:harry")
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        res = self.get(f"/api/organisations/{organisation.id}/users", query_data={"q": "jan"}, with_basic_auth=False)
        self.assertEqual(1, len(res))
        self.assertEqual(res[0]["name"], user_jane_name)
        for attr in "last_accessed_date", "second_factor_auth":
            self.assertFalse(attr in res[0])

    def test_search_users_admin(self):
        self.login("urn:john")
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        res = self.get(f"/api/organisations/{organisation.id}/users", query_data={"q": "jane"}, with_basic_auth=False)
        self.assertEqual(1, len(res))

    def test_search_users_eppn(self):
        self.login("urn:paul")
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        res = self.get(f"/api/organisations/{organisation.id}/users", query_data={"q": "woods.io"},
                       with_basic_auth=False)
        self.assertEqual(1, len(res))

    def test_search_invitations(self):
        self.login("urn:harry")
        organisation = self.find_entity_by_name(Organisation, unihard_name)
        res = self.get(f"/api/organisations/{organisation.id}/invites", query_data={"q": "iou"}, with_basic_auth=False)
        self.assertEqual(1, len(res))
        invitation = res[0]
        self.assertEqual(invitation["invitee_email"], "curious@ex.org")
        self.assertEqual(invitation["collaboration_memberships"][0]["collaboration"]["name"], co_ai_computing_name)

    def test_name_by_id(self):
        self.login("urn:harry")
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        res = self.get(f"/api/organisations/name_by_id/{organisation_id}", with_basic_auth=False)
        self.assertEqual(unihard_name, res["name"])

    def test_organisation_update_tags(self):
        self.login()
        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        organisation = self.get(f"/api/organisations/{organisation_id}", with_basic_auth=False)
        tags = [tag for tag in organisation["tags"] if tag["is_default"]]

        tags[0]["tag_value"] = "changed"  # change name of first tag
        del tags[1]["id"]  # remove id of second tag, so it will be added with an identical name (should be discarded)
        tags.append({"tag_value": "extra", "is_default": True, "units": []})  # add a new tag
        organisation["tags"] = tags

        self.put("/api/organisations", body=organisation)

        tags = self.find_entity_by_name(Organisation, unihard_name).tags
        self.assertEqual(4, len(tags))
        self.assertListEqual(sorted(["changed", "extra", "tag_default_uuc", "tag_orphan"]),
                             sorted([tag.tag_value for tag in tags]))
