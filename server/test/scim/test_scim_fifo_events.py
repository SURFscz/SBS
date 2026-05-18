"""SCIM broadcast FIFO ordering via per-endpoint pool."""

import os
import threading
import time
import unittest
from unittest.mock import patch

from server.db.domain import Collaboration, Group
from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed
from server.test.abstract_test import AbstractTest
from server.test.seed import co_research_name, group_science_name


class TestScimFifoEvents(AbstractTest):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        os.environ.pop("SCIM_DISABLED", None)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        os.environ["SCIM_DISABLED"] = "1"

    def test_interleaved_collab_and_group_fifo_per_endpoint(self):
        collaboration = self.find_entity_by_name(Collaboration, co_research_name)
        group = self.find_entity_by_name(Group, group_science_name)
        call_log: list[str] = []
        lock = threading.Lock()

        def record_collab(*_args, **_kwargs):
            time.sleep(0.05)
            with lock:
                call_log.append("collab")

        def record_group(*_args, **_kwargs):
            with lock:
                call_log.append("group")

        with patch("server.scim.events.apply_collaboration_change", side_effect=record_collab), \
                patch("server.scim.events.apply_group_change", side_effect=record_group):
            n = 5
            futures = []
            for _ in range(n):
                futures.append(broadcast_collaboration_changed(collaboration.id))
                futures.append(broadcast_group_changed(group.id))
            for future in futures:
                future.result()

        self.assertEqual(["collab", "group"] * n, call_log)

if __name__ == "__main__":
    unittest.main()
