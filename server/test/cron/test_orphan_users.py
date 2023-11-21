
from server.cron.orphan_users import delete_orphan_users
from server.db.audit_mixin import AuditLog, ACTION_CREATE
from server.db.db import db
from server.db.domain import User
from server.test.abstract_test import AbstractTest
from server.test.seed import user_jane_name


class TestOrphanUsers(AbstractTest):

    def test_schedule(self):
        # insert some activity to test the assertion as audit logs are emptied before the test
        jane = self.find_entity_by_name(User, user_jane_name)
        audit_log = AuditLog(jane.id, jane.id, "collaboration_memberships", None, None, None, None, ACTION_CREATE, None,
                             None)
        db.session.merge(audit_log)
        db.session.commit()

        mail = self.app.mail
        with mail.record_messages() as outbox:
            results = delete_orphan_users(self.app)

            self.assertEqual(1, len(outbox))
            self.assertTrue("urn:mary" in outbox[0].html)
            self.assertFalse("urn:peter" in outbox[0].html)
            self.assertFalse("urn:jane" in outbox[0].html)

            self.assertEqual(14, len(results["orphan_users"]))

            results = delete_orphan_users(self.app)
            self.assertEqual(0, len(results["orphan_users"]))

    def test_system_orphan_users(self):
        results = self.put("/api/system/orphan_users")
        self.assertEqual(15, len(results["orphan_users"]))
