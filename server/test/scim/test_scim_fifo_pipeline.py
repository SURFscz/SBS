"""Integration tests for Redis SCIM queues + FifoPool + dispatcher pipeline."""

import json
import os
import threading
import time
import unittest
from unittest.mock import patch

from server.db.domain import Collaboration, Group, Service
from server.scim.dispatcher import dispatch_scim_task
from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed
from server.scim.fifo_pool import FifoPool
from server.scim.queue import ScimQueue, normalize_scim_url
from server.test.abstract_test import AbstractTest
from server.test.seed import co_research_name, group_science_name, service_cloud_name, service_storage_name


class TestScimFifoPipeline(AbstractTest):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        os.environ.pop("SCIM_DISABLED", None)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        os.environ["SCIM_DISABLED"] = "1"

    def _drain_captured_tasks(self, captured: list[tuple[str, str]], max_workers: int = 4):
        """Process tasks captured from enqueue (same shape as production Redis drain loop)."""
        pool = FifoPool(max_workers=max_workers)
        for endpoint_url, payload_json in captured:
            pool.submit(
                endpoint_url,
                lambda p=payload_json: dispatch_scim_task(self.app, p),
            )
        pool.shutdown(wait=True)

    def _clear_scim_redis_queues(self):
        pattern = "scim:queue:endpoint:*"
        for key in self.app.redis_client.keys(pattern):
            self.app.redis_client.delete(key)

    def test_interleaved_collab_and_group_stay_fifo_per_endpoint(self):
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

        captured: list[tuple[str, str]] = []

        def capture_enqueue(_queue, endpoint_url, payload_json):
            captured.append((endpoint_url, payload_json))
            return True

        self._clear_scim_redis_queues()

        with patch("server.scim.events.ScimQueue.enqueue_by_endpoint", autospec=True, side_effect=capture_enqueue), \
                patch("server.scim.dispatcher.apply_collaboration_change", side_effect=record_collab), \
                patch("server.scim.dispatcher.apply_group_change", side_effect=record_group):
            n = 5
            for _ in range(n):
                broadcast_collaboration_changed(collaboration.id)
                broadcast_group_changed(group.id)
            self.assertEqual(n * 2, len(captured))
            self._drain_captured_tasks(captured)

        self.assertEqual(["collab", "group"] * n, call_log)

    def test_different_endpoints_can_be_processed_in_parallel(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        storage = self.find_entity_by_name(Service, service_storage_name)
        endpoint_a = normalize_scim_url(cloud.scim_url)
        endpoint_b = normalize_scim_url("http://scim-endpoint-b.example/scim")
        storage.scim_url = endpoint_b
        self.app.db.session.commit()

        started = {"a": threading.Event(), "b": threading.Event()}
        release = threading.Event()
        execution_order: list[str] = []
        order_lock = threading.Lock()

        def slow_task(label: str, started_event: threading.Event):
            started_event.set()
            with order_lock:
                execution_order.append(f"{label}-start")
            self.assertTrue(release.wait(timeout=2), f"Timed out waiting to release {label}")
            with order_lock:
                execution_order.append(f"{label}-end")

        self._clear_scim_redis_queues()
        queue = ScimQueue(self.app.redis_client)

        payload_a = json.dumps({
            "action": "group_changed",
            "group_id": 1,
            "deletion": False,
            "service_ids": [cloud.id],
            "timestamp": "2026-05-18T00:00:00Z",
        })
        payload_b = json.dumps({
            "action": "group_changed",
            "group_id": 2,
            "deletion": False,
            "service_ids": [storage.id],
            "timestamp": "2026-05-18T00:00:01Z",
        })
        queue.enqueue_by_endpoint(endpoint_a, payload_a)
        queue.enqueue_by_endpoint(endpoint_b, payload_b)

        with patch("server.scim.dispatcher.apply_group_change", side_effect=lambda *_a, **_k: None):
            pool = FifoPool(max_workers=2)

            def make_worker(endpoint: str, label: str, started_event: threading.Event):
                def worker_task():
                    slow_task(label, started_event)

                return worker_task

            pool.submit(endpoint_a, make_worker(endpoint_a, "a", started["a"]))
            pool.submit(endpoint_b, make_worker(endpoint_b, "b", started["b"]))

            self.assertTrue(started["a"].wait(timeout=2), "endpoint A task did not start")
            self.assertTrue(started["b"].wait(timeout=2), "endpoint B task did not start")
            release.set()
            pool.shutdown(wait=True)

        a_start = execution_order.index("a-start")
        b_start = execution_order.index("b-start")
        a_end = execution_order.index("a-end")
        b_end = execution_order.index("b-end")
        # Both receivers must have started before either finishes (concurrent overlap).
        self.assertLess(max(a_start, b_start), min(a_end, b_end), execution_order)
        self.assertIn("a-start", execution_order)
        self.assertIn("b-start", execution_order)
        self.assertIn("a-end", execution_order)
        self.assertIn("b-end", execution_order)

    def test_full_pipeline_parallel_endpoints_via_redis(self):
        cloud = self.find_entity_by_name(Service, service_cloud_name)
        storage = self.find_entity_by_name(Service, service_storage_name)
        endpoint_a = normalize_scim_url(cloud.scim_url)
        endpoint_b = normalize_scim_url("http://scim-receiver-b.example/scim")
        storage.scim_url = endpoint_b
        self.app.db.session.commit()

        release = threading.Event()
        timeline: list[tuple[float, str]] = []
        timeline_lock = threading.Lock()

        def record_dispatch(endpoint: str):
            def _inner(*_args, **_kwargs):
                label = "A" if endpoint == endpoint_a else "B"
                with timeline_lock:
                    timeline.append((time.monotonic(), f"{label}-start"))
                self.assertTrue(release.wait(timeout=2), label)
                with timeline_lock:
                    timeline.append((time.monotonic(), f"{label}-end"))
            return _inner

        captured = [
            (endpoint_a, json.dumps({
                "action": "group_changed", "group_id": 1, "deletion": False,
                "service_ids": [cloud.id], "timestamp": "2026-05-18T00:00:00Z",
            })),
            (endpoint_b, json.dumps({
                "action": "group_changed", "group_id": 2, "deletion": False,
                "service_ids": [storage.id], "timestamp": "2026-05-18T00:00:01Z",
            })),
        ]

        pool = FifoPool(max_workers=2)
        for endpoint_url, _payload_json in captured:
            pool.submit(endpoint_url, lambda e=endpoint_url: record_dispatch(e)())

        wait_deadline = time.time() + 2
        while time.time() < wait_deadline:
            with timeline_lock:
                started = {e for _, e in timeline}
            if "A-start" in started and "B-start" in started:
                break
            time.sleep(0.01)
        else:
            self.fail(f"Both endpoints did not start: {timeline}")

        release.set()
        pool.shutdown(wait=True)

        events = [e for _, e in timeline]
        a_start = next(i for i, e in enumerate(events) if e == "A-start")
        b_start = next(i for i, e in enumerate(events) if e == "B-start")
        a_end = next(i for i, e in enumerate(events) if e == "A-end")
        b_end = next(i for i, e in enumerate(events) if e == "B-end")
        self.assertLess(max(a_start, b_start), min(a_end, b_end), events)


if __name__ == "__main__":
    unittest.main()
