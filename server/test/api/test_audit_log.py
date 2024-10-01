from flask import jsonify

from server.db.audit_mixin import ACTION_DELETE, ACTION_CREATE, ACTION_UPDATE, AuditLog
from server.db.domain import User, Collaboration, Service, Organisation, Group
from server.test.abstract_test import AbstractTest
from server.test.seed import service_cloud_name, co_ai_computing_name, \
    service_mail_name, invitation_hash_curious, unihard_invitation_hash, unihard_name, group_science_name, \
    user_sarah_name, \
    user_james_name, co_teachers_name, co_monitoring_name, unifra_name
from server.tools import dt_now


class TestAuditLog(AbstractTest):

    @staticmethod
    def audit_log_by_target_type(target_type, res):
        audit_logs = res["audit_logs"]
        return list(filter(lambda audit_log: audit_log["target_type"] == target_type, audit_logs))

    def test_me(self):
        self.login()
        res = self.get("/api/audit_logs/me", with_basic_auth=False)

        self.assertEqual(ACTION_UPDATE, res["audit_logs"][0]["action"])

    def test_me_impersonation(self):
        self.login("urn:john")
        user_id = self.find_entity_by_name(User, user_james_name).id
        res = self.get("/api/audit_logs/me", with_basic_auth=False, headers={"X-IMPERSONATE-ID": str(user_id)})
        self.assertEqual(2, len(res))

    def test_other_(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        sarah_id = sarah.id
        self.login("urn:sarah")
        body = {
            "ssh_keys": [{"ssh_value": "some_ssh"}, {"ssh_value": "overwrite_existing", "id": sarah.ssh_keys[0].id}]}
        self.put("/api/users", body, with_basic_auth=False)

        self.login("urn:john")
        res = self.get(f"/api/audit_logs/other/{sarah_id}")
        self.assertEqual("sarah", res["users"][0]["username"])

    def test_other_403(self):
        sarah = self.find_entity_by_name(User, user_sarah_name)
        self.login("urn:mary")
        self.get(f"/api/audit_logs/other/{sarah.id}", response_status_code=403)

    def test_services_info(self):
        self.login("urn:john")
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id
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
        collaboration_id = self.find_entity_by_name(Collaboration, co_ai_computing_name).id

        self.login()
        res = self.get(f"/api/audit_logs/info/{collaboration_id}/collaborations")

        self.assertEqual(2, len(res["audit_logs"]))
        self.assertEqual(ACTION_UPDATE, self.audit_log_by_target_type("invitations", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("collaboration_memberships", res)[0]["action"])

        self.assertEqual(1, len(res["collaborations"]))
        self.assertEqual("AI computing", res["collaborations"][0]["name"])

    def test_organisation(self):
        self.login("urn:sarah")
        self.put("/api/organisation_invitations/accept", body={"hash": unihard_invitation_hash},
                 with_basic_auth=False)

        organisation_id = self.find_entity_by_name(Organisation, unihard_name).id
        self.login()
        res = self.get(f"/api/audit_logs/info/{organisation_id}/organisations")

        self.assertEqual(2, len(res["audit_logs"]))
        self.assertEqual(ACTION_DELETE, self.audit_log_by_target_type("organisation_invitations", res)[0]["action"])
        self.assertEqual(ACTION_CREATE, self.audit_log_by_target_type("organisation_memberships", res)[0]["action"])

    def test_groups(self):
        self.login()

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
        self.put("/api/organisation_invitations/accept", body={"hash": unihard_invitation_hash},
                 with_basic_auth=False)

        self.login()
        res = self.get("/api/audit_logs/activity")
        self.assertEqual(4, len(res["audit_logs"]))
        self.assertEqual(1, len(res["organisations"]))
        self.assertEqual(2, len(res["users"]))

        res = self.get("/api/audit_logs/activity", query_data={"limit": 2})
        self.assertEqual(2, len(res["audit_logs"]))

        tables = ["organisation_invitations", "users"]
        res = self.get("/api/audit_logs/activity", query_data={"tables": ",".join(tables)})
        self.assertEqual(3, len(res["audit_logs"]))
        actual = sorted(list(set([audit_log["target_type"] for audit_log in res["audit_logs"]])))
        self.assertEqual(tables, actual)

        res = self.get("/api/audit_logs/activity", query_data={"query": "DMI"})
        self.assertEqual(2, len(res["audit_logs"]))
        self.assertEqual(1, len(res["organisations"]))
        self.assertEqual(2, len(res["users"]))

    def test_no_last_activity_date_only_audit_logs(self):
        collaboration = self.find_entity_by_name(Collaboration, co_ai_computing_name)
        collaboration.last_activity_date = dt_now()
        self.save_entity(collaboration)
        audit_logs = AuditLog.query.all()
        self.assertEqual(0, len(audit_logs))

    def test_manager_no_access_based_on_unit(self):
        self.login("urn:harry")
        collaboration = self.find_entity_by_name(Collaboration, co_teachers_name)
        self.get(f"/api/audit_logs/info/{collaboration.id}/collaborations", response_status_code=403)

    def test_filter_collaborations_audit_logs_based_on_units(self):
        collaboration = self.find_entity_by_name(Collaboration, co_teachers_name)
        collaboration.name = "changed"
        self.save_entity(collaboration)
        self.login("urn:harry")
        res = self.get(f"/api/audit_logs/info/{collaboration.organisation_id}/organisations")
        collaboration_audit_logs = [log for log in res["audit_logs"] if log["target_type"] == "collaborations"]
        self.assertEqual(0, len(collaboration_audit_logs))

    def test_filter_collaborations_audit_logs_admin(self):
        collaboration = self.find_entity_by_name(Collaboration, co_monitoring_name)
        collaboration.name = "changed"
        self.save_entity(collaboration)
        self.login("urn:extra_admin")
        res = self.get(f"/api/audit_logs/info/{collaboration.id}/collaborations")
        collaboration_audit_logs = [log for log in res["audit_logs"] if log["target_type"] == "collaborations"]
        self.assertEqual(1, len(collaboration_audit_logs))

    def test_filter_collaborations_audit_logs_no_access(self):
        collaboration = self.find_entity_by_name(Collaboration, co_monitoring_name)
        collaboration.name = "changed"
        self.save_entity(collaboration)
        self.login("urn:james")
        self.get(f"/api/audit_logs/info/{collaboration.id}/collaborations", response_status_code=403)

    def test_filter_organisation_audit_logs_admin(self):
        collaboration = self.find_entity_by_name(Collaboration, "Monitoring CO numero 2")
        organisation_id = collaboration.organisation_id
        collaboration.name = "changed"
        self.save_entity(collaboration)
        self.login("urn:mary")
        res = self.get(f"/api/audit_logs/info/{organisation_id}/organisations")
        organisation_audit_logs = [log for log in res["audit_logs"] if log["target_type"] == "collaborations"]
        self.assertEqual(1, len(organisation_audit_logs))

    def test_user_no_access(self):
        self.login("urn:james")
        self.get("/api/audit_logs/info/1/services", response_status_code=403)

    def test_organisation_api_key_history(self):
        self.login("urn:james")
        self.get("/api/audit_logs/info/1/services", response_status_code=403)

    def test_organisation_access_non_collaborations(self):
        organisation_id = self.find_entity_by_name(Organisation, unifra_name).id

        secret = self.get("/api/api_keys")["value"]
        self.post("/api/api_keys",
                            body={"organisation_id": organisation_id, "hashed_secret": secret, "description": "Test"})

        self.login("urn:jane")
        res = self.get(f"/api/audit_logs/info/{organisation_id}/organisations", with_basic_auth=False)
        target_type = res["audit_logs"][0]["target_type"]
        self.assertEqual("api_keys", target_type)
