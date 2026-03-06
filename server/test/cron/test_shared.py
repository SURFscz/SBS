from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from server.cron.cleanup_non_open_requests import cleanup_non_open_requests_lock_name, cleanup_non_open_requests
from server.cron.collaboration_expiration import expire_collaborations, collaboration_expiration_lock_name
from server.cron.collaboration_inactivity_suspension import suspend_collaborations, \
    collaboration_inactivity_suspension_lock_name
from server.cron.membership_expiration import membership_expiration_lock_name, expire_memberships
from server.cron.orphan_users import orphan_users_lock_name, delete_orphan_users
from server.cron.outstanding_requests import outstanding_requests_lock_name, outstanding_requests
from server.cron.scim_sweep_services import scim_sweep_services, scim_sweep_services_lock_name
from server.cron.user_suspending import suspend_users
from server.cron.user_suspending import suspend_users_lock_name
from server.test.abstract_test import AbstractTest


class TestShared(AbstractTest):

    def _do_schedule_lock(self, lock_name, method_to_test):
        session = sessionmaker(self.app.db.engine)()
        try:
            # Insert a lock to simulate another instance holding it
            session.execute(
                text("INSERT INTO distributed_locks (lock_name, acquired_at) VALUES (:lock_name, NOW())"),
                {"lock_name": lock_name}
            )
            session.commit()
            
            # Run the method - it should fail to obtain the lock
            res = method_to_test(self.app)
            for value in res.values():
                self.assertEqual(0, len(value))
        finally:
            # Clean up the lock
            session.execute(
                text("DELETE FROM distributed_locks WHERE lock_name = :lock_name"),
                {"lock_name": lock_name}
            )
            session.commit()
            session.close()

    def test_schedule_lock(self):
        locks_and_crons = {cleanup_non_open_requests_lock_name: cleanup_non_open_requests,
                           outstanding_requests_lock_name: outstanding_requests,
                           collaboration_expiration_lock_name: expire_collaborations,
                           collaboration_inactivity_suspension_lock_name: suspend_collaborations,
                           membership_expiration_lock_name: expire_memberships,
                           suspend_users_lock_name: suspend_users,
                           orphan_users_lock_name: delete_orphan_users,
                           scim_sweep_services_lock_name: scim_sweep_services}
        for lock_name, method_to_test in locks_and_crons.items():
            self._do_schedule_lock(lock_name, method_to_test)
