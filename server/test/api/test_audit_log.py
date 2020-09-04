# -*- coding: future_fstrings -*-
import json

from server.db.audit_mixin import ACTION_DELETE, ACTION_CREATE
from server.db.domain import User, Collaboration, Service, Organisation, Group
from server.test.abstract_test import AbstractTest
from server.test.seed import join_request_peter_hash, roger_name, service_cloud_name, ai_computing_name, \
    service_mail_name, invitation_hash_curious, organisation_invitation_hash, uuc_name, group_science_name, \
    uva_research_name


class TestAuditLog(AbstractTest):

    @staticmethod
    def audit_log_by_target_type(target_type, res):
        audit_logs = res["audit_logs"]
        return list(filter(lambda audit_log: audit_log["target_type"] == target_type, audit_logs))

    def test_me_join(self):
        self.login()
        self.put("/api/join_requests/accept", body={"hash": join_request_peter_hash})

        self.login("urn:peter")
        res = self.get("/api/audit_logs/me")

        self.assertEqual(ACTION_DELETE, self.audit_log_by_target_type("join_requests", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("collaboration_memberships", res)[0]["action"])

    def test_me_profile(self):
        roger = self.find_entity_by_name(User, roger_name)
        self.login("urn:roger")

        body = {"ssh_key": "ssh_value",
                "id": roger.id}

        self.put("/api/users", body, with_basic_auth=False)
        res = self.get("/api/audit_logs/me")

        self.assertEqual(2, len(res))
        audit_logs = res["audit_logs"]

        state_before = json.loads(audit_logs[0]["state_before"])
        state_after = json.loads(audit_logs[0]["state_after"])

        self.assertIsNone(state_before["ssh_key"])
        for k in ["ssh"]:
            self.assertEqual(f"{k}_value", state_after[f"{k}_key"])

    def test_services_info(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        service_cloud_id = self.find_entity_by_name(Service, service_cloud_name).id

        self.put("/api/collaborations_services/", body={
            "collaboration_id": collaboration_id,
            "service_id": service_cloud_id
        })

        mail = self.get(f"api/services/{self.find_entity_by_name(Service, service_mail_name).id}")
        mail["name"] = "changed"
        self.put("/api/services", body=mail)

        res = self.get(f"/api/audit_logs/info/{service_cloud_id}/services")

        self.assertEqual(3, len(res))
        self.assertListEqual(sorted(["audit_logs", "collaborations", "users"]), sorted(list(res.keys())))

    def test_collaboration(self):
        self.login("urn:james")
        self.put("/api/invitations/accept", body={"hash": invitation_hash_curious}, with_basic_auth=False)

        self.login("urn:admin")
        collaboration_id = self.find_entity_by_name(Collaboration, ai_computing_name).id
        res = self.get(f"/api/audit_logs/info/{collaboration_id}/collaborations")

        self.assertEqual(2, len(res["audit_logs"]))
        self.assertEqual(ACTION_DELETE, self.audit_log_by_target_type("invitations", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("collaboration_memberships", res)[0]["action"])

    def test_organisation(self):
        self.login("urn:sarah")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)

        organisation_id = self.find_entity_by_name(Organisation, uuc_name).id
        res = self.get(f"/api/audit_logs/info/{organisation_id}/organisations")

        self.assertEqual(2, len(res["audit_logs"]))
        self.assertEqual(ACTION_DELETE, self.audit_log_by_target_type("organisation_invitations", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("organisation_memberships", res)[0]["action"])

    def test_groups(self):
        self.login("urn:sarah")

        collaboration_id = self.find_entity_by_name(Collaboration, uva_research_name).id
        group_id = self.find_entity_by_name(Group, group_science_name).id
        group = self.get(f"/api/groups/{group_id}/{collaboration_id}")

        group["short_name"] = "new_short_name"
        self.put("/api/groups/", body=group)

        res = self.get(f"/api/audit_logs/info/{group['id']}/groups")

        audit_log_groups = self.audit_log_by_target_type("groups", res)
        self.assertEqual(1, len(audit_log_groups))

        audit_log_collaboration_memberships = self.audit_log_by_target_type("collaboration_memberships", res)
        self.assertEqual(3, len(audit_log_collaboration_memberships))
