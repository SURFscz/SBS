# -*- coding: future_fstrings -*-
import json

from flask import jsonify

from server.db.audit_mixin import ACTION_DELETE, ACTION_CREATE, ACTION_UPDATE
from server.db.domain import User, Collaboration, Service, Organisation, Group
from server.test.abstract_test import AbstractTest
from server.test.seed import join_request_peter_hash, service_cloud_name, ai_computing_name, \
    service_mail_name, invitation_hash_curious, organisation_invitation_hash, uuc_name, group_science_name, sarah_name, \
    james_name


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

        self.assertEqual(ACTION_UPDATE, self.audit_log_by_target_type("join_requests", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("collaboration_memberships", res)[0]["action"])

    def test_me_profile(self):
        sarah = self.find_entity_by_name(User, sarah_name)
        self.login("urn:sarah")

        body = {"ssh_keys":
            [
                {"ssh_value": "some_ssh"},
                {"ssh_value": "overwrite_existing", "id": sarah.ssh_keys[0].id}
            ]
        }

        self.put("/api/users", body, with_basic_auth=False)
        res = self.get("/api/audit_logs/me")

        audit_logs = res["audit_logs"]
        self.assertEqual(3, len(audit_logs))

        self.assertEqual(ACTION_UPDATE, audit_logs[1]["action"])
        state_after = json.loads(audit_logs[1]["state_after"])
        self.assertEqual(state_after["ssh_value"], "overwrite_existing")

        self.assertEqual(ACTION_CREATE, audit_logs[2]["action"])
        state_after = json.loads(audit_logs[2]["state_after"])
        self.assertEqual(state_after["ssh_value"], "some_ssh")

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

        self.assertEqual(1, len(res["collaborations"]))
        self.assertEqual("AI computing", res["collaborations"][0]["name"])

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

        group = jsonify(self.find_entity_by_name(Group, group_science_name)).json

        group["short_name"] = "new_short_name"
        self.put("/api/groups/", body=group)

        res = self.get(f"/api/audit_logs/info/{group['id']}/groups")

        audit_log_groups = self.audit_log_by_target_type("groups", res)
        self.assertEqual(1, len(audit_log_groups))
        self.assertEqual("Science", audit_log_groups[0]["target_name"])

        audit_log_collaboration_memberships = self.audit_log_by_target_type("collaboration_memberships", res)
        self.assertEqual(3, len(audit_log_collaboration_memberships))

    def test_activity(self):
        self.login("urn:sarah")
        self.put("/api/organisation_invitations/accept", body={"hash": organisation_invitation_hash},
                 with_basic_auth=False)

        res = self.get("/api/audit_logs/activity")
        self.assertEqual(3, len(res["audit_logs"]))
        self.assertEqual(1, len(res["organisations"]))
        self.assertEqual(2, len(res["users"]))

    def test_me_impersonate(self):
        james = User.query.filter(User.uid == "urn:james").one()
        self.login("urn:james")
        body = {"ssh_keys": [{"ssh_value": "some_ssh"}]}
        self.put("/api/users", body, with_basic_auth=False)

        self.login("urn:john")
        res = self.get("/api/audit_logs/me", with_basic_auth=False,
                       headers={"X-IMPERSONATE-ID": james.id, "X-IMPERSONATE-UID": james.uid,
                                "X-IMPERSONATE-NAME": james_name})
        self.assertEqual(james_name, json.loads(res["audit_logs"][0]["state_before"])["name"])
