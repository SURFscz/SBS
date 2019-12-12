# -*- coding: future_fstrings -*-
from server.db.domain import Collaboration, Group
from server.test.abstract_test import AbstractTest
from server.test.seed import ai_researchers_group, ai_computing_name, ai_researchers_group_short_name


class TestGroup(AbstractTest):

    def test_my_groups(self):
        self.login("urn:john")
        groups = self.get("api/groups", with_basic_auth=False)
        self.assertEqual(2, len(groups))

    def test_group_name_exists(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/groups/name_exists",
                       query_data={"name": ai_researchers_group, "collaboration_id": collaboration_id})
        self.assertEqual(True, res)

        res = self.get("/api/groups/name_exists",
                       query_data={"name": "uuc", "existing_group": ai_researchers_group,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/groups/name_exists",
                       query_data={"name": "xyc", "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/groups/name_exists",
                       query_data={"name": "xyc", "existing_group": "xyc",
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

    def test_group_short_name_exists(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id

        res = self.get("/api/groups/short_name_exists",
                       query_data={"short_name": ai_researchers_group_short_name,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(True, res)

        res = self.get("/api/groups/short_name_exists",
                       query_data={"short_name": "uuc",
                                   "existing_group": ai_researchers_group_short_name,
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/groups/short_name_exists",
                       query_data={"short_name": "xyc", "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

        res = self.get("/api/groups/short_name_exists",
                       query_data={"short_name": "xyc", "existing_group": "xyc",
                                   "collaboration_id": collaboration_id})
        self.assertEqual(False, res)

    def test_group_by_id(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        group_id = self.find_entity_by_name(Group, ai_researchers_group).id
        self.login("urn:admin")
        group = self.get(f"/api/groups/{group_id}/{collaboration_id}", with_basic_auth=False)
        self.assertTrue(len(group["collaboration_memberships"]) > 0)

    def test_group_by_id_regular_member(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        group_id = self.find_entity_by_name(Group, ai_researchers_group).id
        self.login("urn:jane")
        group = self.get(f"/api/groups/{group_id}/{collaboration_id}", with_basic_auth=False)
        self.assertTrue(len(group["collaboration_memberships"]) > 0)

    def test_group_by_id_forbidden(self):
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        group_id = self.find_entity_by_name(Group, ai_researchers_group).id
        self.login("urn:peter")
        self.get(f"/api/groups/{group_id}/{collaboration_id}", with_basic_auth=False, response_status_code=403)

    def test_save_group(self):
        self._do_test_save_group(False, 0, 0)

    def test_save_group_auto_provision_members(self):
        self._do_test_save_group(True, 2, 4)

    def _do_test_save_group(self, auto_provision_members, invitations_count, members_count):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        group_name = "new_auth_group"
        group = self.post("/api/groups/", body={
            "name": group_name,
            "short_name": group_name,
            "description": "des",
            "auto_provision_members": auto_provision_members,
            "collaboration_id": collaboration_id,
        })
        group = self.get(f"/api/groups/{group['id']}/{collaboration_id}")

        self.assertEqual("uuc:ai_computing:new_auth_group", group["global_urn"])
        self.assertEqual(invitations_count, len(group["invitations"]))
        self.assertEqual(members_count, len(group["collaboration_memberships"]))

    def test_update_group(self):
        self._do_test_update_group(False, 0, 2)

    def test_update_group_auto_provision_members(self):
        self._do_test_update_group(True, 2, 4)
        # Idempotency
        self._do_test_update_group(True, 2, 4)

    def _do_test_update_group(self, auto_provision_members, invitations_count, members_count):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        group_id = self.find_entity_by_name(Group, ai_researchers_group).id
        group = self.get(f"/api/groups/{group_id}/{collaboration_id}")
        group["short_name"] = "new_short_name"
        group["auto_provision_members"] = auto_provision_members
        self.put("/api/groups/", body=group)

        group = self.find_entity_by_name(Group, ai_researchers_group)

        self.assertEqual("uuc:ai_computing:new_short_name", group.global_urn)
        self.assertEqual(group.auto_provision_members, auto_provision_members)
        self.assertEqual(invitations_count, len(group.invitations))
        self.assertEqual(members_count, len(group.collaboration_memberships))

    def test_delete_group(self):
        group_id = self.find_entity_by_name(Group, ai_researchers_group).id
        self.delete(f"/api/groups", primary_key=group_id)
        self.delete(f"/api/groups", primary_key=group_id, response_status_code=404)

    def test_groups_by_collaboration(self):
        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        groups = self.get(f"/api/groups/all/{collaboration_id}")
        self.assertEqual(2, len(groups))
