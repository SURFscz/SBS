# -*- coding: future_fstrings -*-
from flask import jsonify

from server.db.domain import Service, ServiceGroup
from server.test.abstract_test import AbstractTest
from server.test.seed import service_mail_name, service_group_mail_name


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

    def test_save_service_group(self):
        self.login("urn:john")
        service_id = self.find_entity_by_name(Service, service_mail_name).id
        service_group_name = "new_auth_service_group"
        self.post("/api/servicegroups/", body={
            "name": service_group_name,
            "short_name": service_group_name,
            "description": "des",
            "auto_provision_members": False,
            "service_id": service_id,
        }, with_basic_auth=False)
        service_group = self.find_entity_by_name(ServiceGroup, service_group_name)
        self.assertIsNotNone(service_group)

    def test_update_service_group(self):
        self.login("urn:john")
        service_group = jsonify(self.find_entity_by_name(ServiceGroup, service_group_mail_name)).json
        service_group["short_name"] = "new_short_name"
        service_group["auto_provision_members"] = True
        self.put("/api/servicegroups/", body=service_group, with_basic_auth=False)

        service_group = self.find_entity_by_name(ServiceGroup, service_group_mail_name)

        self.assertEqual("new_short_name", service_group.short_name)

    def test_delete_service_group(self):
        service_group_id = self.find_entity_by_name(ServiceGroup, service_group_mail_name).id
        self.delete("/api/servicegroups", primary_key=service_group_id)
        self.delete("/api/servicegroups", primary_key=service_group_id, response_status_code=404)
