from flask import jsonify

from server.db.domain import Service, ServiceGroup, Collaboration
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_group_mail_name, service_cloud_name, co_research_name


class TestServiceGroup(AbstractTest):

    def test_service_group_name_exists(self):
        service_id = self.find_entity_by_name(Service, service_mail_name).id

        res = self.get("/api/servicegroups/name_exists",
                       query_data={"name": service_group_mail_name, "service_id": service_id})
        self.assertEqual(True, res)

        res = self.get("/api/servicegroups/name_exists",
                       query_data={"name": service_group_mail_name,
                                   "existing_service_group": service_group_mail_name,
                                   "service_id": service_id})
        self.assertEqual(False, res)

        res = self.get("/api/servicegroups/name_exists",
                       query_data={"name": "nope", "service_id": service_id})
        self.assertEqual(False, res)

    def test_service_group_short_name_exists(self):
        service_id = self.find_entity_by_name(Service, service_mail_name).id

        res = self.get("/api/servicegroups/short_name_exists",
                       query_data={"short_name": "mail",
                                   "service_id": service_id})
        self.assertEqual(True, res)

        res = self.get("/api/servicegroups/short_name_exists",
                       query_data={"short_name": "mail",
                                   "existing_service_group": "mail",
                                   "service_id": service_id})
        self.assertEqual(False, res)

        res = self.get("/api/servicegroups/short_name_exists",
                       query_data={"short_name": "xyc", "existing_group": "xyc",
                                   "service_id": service_id})
        self.assertEqual(False, res)

    def test_find_by_service_uuid(self):
        service_uui4 = self.find_entity_by_name(Service, service_mail_name).uuid4

        res = self.get(f"/api/servicegroups/find_by_service_uuid/{service_uui4}")
        self.assertEqual(1, len(res))

    def test_save_service_group(self):
        self.login("urn:john")
        service_cloud = self.find_entity_by_name(Service, service_cloud_name)
        service_id = service_cloud.id
        service_group_name = "new_auth_service_group"
        self.post("/api/servicegroups/", body={
            "name": service_group_name,
            "short_name": service_group_name,
            "description": "des",
            "auto_provision_members": False,
            "service_id": service_id,
        }, with_basic_auth=False)
        service_group = self.find_entity_by_name(ServiceGroup, service_group_name)
        groups = service_group.groups
        self.assertEqual(1, len(groups))
        self.assertEqual("ufra:research:cloud-new_auth_service", groups[0].global_urn)

        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        group = list(filter(lambda g: g.short_name == "cloud-new_auth_service", collaboration.groups))[0]
        # Not allowed to delete group with connected service
        self.delete("/api/groups", group.id, with_basic_auth=False, response_status_code=403)

    def test_update_service_group(self):
        self.login("urn:service_admin")
        service_group = self.find_entity_by_name(ServiceGroup, service_group_mail_name)
        self.assertFalse(False, service_group.groups[0].auto_provision_members)
        self.assertEqual(0, len(service_group.groups[0].collaboration_memberships))

        service_group_json = jsonify(service_group).json
        service_group_json["description"] = "this is a new description"
        service_group_json["short_name"] = "new_short_name"
        service_group_json["auto_provision_members"] = True
        self.put("/api/servicegroups/", body=service_group_json, with_basic_auth=False)

        service_group = self.find_entity_by_name(ServiceGroup, service_group_mail_name)
        self.assertEqual("this is a new description", service_group.description)
        self.assertEqual("new_short_name", service_group.short_name)

        groups = service_group.groups
        self.assertEqual(1, len(groups))
        self.assertEqual("this is a new description", groups[0].description)
        self.assertEqual("ufra:research:mail-new_short_name", groups[0].global_urn)
        self.assertTrue(groups[0].auto_provision_members)
        self.assertEqual(4, len(groups[0].collaboration_memberships))

    def test_delete_service_group(self):
        self.login("urn:service_admin")
        service_group_id = self.find_entity_by_name(ServiceGroup, service_group_mail_name).id
        self.delete("/api/servicegroups", primary_key=service_group_id, with_basic_auth=False)
        self.delete("/api/servicegroups", primary_key=service_group_id, response_status_code=404)
