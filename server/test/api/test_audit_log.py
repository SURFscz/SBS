from server.db.audit_mixin import ACTION_DELETE, ACTION_CREATE
from server.test.abstract_test import AbstractTest
from server.test.seed import join_request_peter_hash


class TestAuditLog(AbstractTest):

    def test_me(self):
        self.login()
        self.put("/api/join_requests/accept", body={"hash": join_request_peter_hash})

        self.login("urn:peter")
        res = self.get("/api/audit_log/me")
        audit_log_join_request = list(filter(lambda audit_log: audit_log["target_type"] == "join_requests", res))[0]
        collaboration_membership_audit_log = \
            list(filter(lambda audit_log: audit_log["target_type"] == "collaboration_memberships", res))[0]

        self.assertEqual(ACTION_DELETE, audit_log_join_request["action"])
        self.assertEqual(ACTION_CREATE, collaboration_membership_audit_log["action"])
