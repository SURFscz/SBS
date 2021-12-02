# -*- coding: future_fstrings -*-
from sqlalchemy import text

from server.cron.collaboration_expiration import expire_collaborations, collaboration_expiration_lock_name
from server.cron.collaboration_inactivity_suspension import suspend_collaborations, \
    collaboration_inactivity_suspension_lock_name
from server.cron.membership_expiration import membership_expiration_lock_name, expire_memberships
from server.cron.user_suspending import suspend_users
from server.cron.user_suspending import suspend_users_lock_name
from server.db.db import db
from server.test.abstract_test import AbstractTest


class TestShared(AbstractTest):

    def _do_schedule_lock(self, lock_name, method_to_test):
        session = db.create_session(options={})()
        try:
            session.execute(text(f"SELECT GET_LOCK('{lock_name}', 1)"))
            res = method_to_test(self.app)
            for value in res.values():
                self.assertEqual(0, len(value))
        finally:
            session.execute(text(f"SELECT RELEASE_LOCK('{lock_name}')"))

    def test_schedule_lock(self):
        locks_and_crons = {suspend_users_lock_name: suspend_users,
                           collaboration_expiration_lock_name: expire_collaborations,
                           collaboration_inactivity_suspension_lock_name: suspend_collaborations,
                           membership_expiration_lock_name: expire_memberships}
        for lock_name, method_to_test in locks_and_crons.items():
            self._do_schedule_lock(lock_name, method_to_test)
