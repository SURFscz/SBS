"""
Integration tests: many remote SCIM endpoints and async FIFO pool broadcast handling.

N remote SCIM URLs is greater than SCIM_FIFO_WORKERS (pool threads per process).
Each Gunicorn worker owns its own pool; two lifecycles are simulated in-process.
"""

from __future__ import annotations

import json
import os
import re
import threading
import unittest
from collections import defaultdict
from typing import Any, Callable, DefaultDict, Dict, List, Sequence
from unittest.mock import patch
from urllib.parse import urlparse

import responses
from flask import Flask

from server.db.db import db
from server.db.domain import Collaboration, Group, Service, User
from server.scim.events import (
    broadcast_collaboration_changed,
    broadcast_group_changed,
    broadcast_user_changed,
)
from server.scim.pool import ensure_scim_pool_idle, reset_scim_fifo_pool
from server.scim import events as scim_events_module
from server.scim import scim as scim_apply_module
from server.test.abstract_test import AbstractTest
from server.test.seed import (
    co_research_name,
    group_science_name,
    persist_instance,
    read_image,
    user_peter_name,
)
from server.tools import read_file

# Simulate a busy SRAM tenant: many remote SCIM services and many change events.
# N must exceed SCIM_FIFO_WORKERS so the pool multiplexes endpoint queues.
NUM_SCIM_ENDPOINTS = 16
SCIM_FIFO_WORKERS = 8
NUM_GUNICORN_WORKERS = 4
BROADCAST_ROUNDS = 12
# Each round = collaboration + group + user change (typical SRAM SCIM triggers).
SRAM_SCIM_EVENTS_PER_ROUND = 3

NO_USER_FOUND = json.loads(read_file("test/scim/no_user_found.json"))
NO_GROUP_FOUND = json.loads(read_file("test/scim/no_user_found.json"))
GROUP_CREATED = json.loads(read_file("test/scim/group_created.json"))
USER_CREATED = json.loads(read_file("test/scim/user_created.json"))


def scim_remote_base_url(index: int) -> str:
    return f"http://scim-remote-{index}.test/scim"


def scim_remote_host(index: int) -> str:
    return urlparse(scim_remote_base_url(index)).netloc


def _install_async_scim_pool(app: Flask) -> None:
    os.environ.pop("SCIM_FIFO_SYNC", None)
    os.environ["SCIM_FIFO_WORKERS"] = str(SCIM_FIFO_WORKERS)
    with app.app_context():
        reset_scim_fifo_pool(app)


def _make_recording_apply(
    real_fn: Callable[..., Any],
    label: str,
    task_log: Dict[str, List[str]],
    lock: threading.Lock,
    service_hosts: Dict[int, str],
) -> Callable[..., Any]:
    def wrapper(app, *args, **kwargs):
        service_ids = kwargs.get("service_ids")
        call_args = args
        if service_ids is None and call_args and isinstance(call_args[-1], list):
            service_ids = call_args[-1]
            call_args = call_args[:-1]
        if service_ids:
            host = service_hosts[service_ids[0]]
            with lock:
                task_log[host].append(label)
        return real_fn(app, *call_args, service_ids=service_ids)

    return wrapper


def _register_endpoint_mocks(
    rsps: responses.RequestsMock,
    endpoint_index: int,
    http_log: Dict[str, List[str]],
    lock: threading.Lock,
) -> None:
    base = scim_remote_base_url(endpoint_index)
    host = scim_remote_host(endpoint_index)

    def log_request(request: Any) -> tuple[int, dict, str]:
        path = urlparse(request.url).path
        with lock:
            http_log[host].append(f"{request.method} {path}")
        if request.method == "GET" and "/Users" in path:
            body = NO_USER_FOUND
        elif request.method == "GET" and "/Groups" in path:
            body = NO_GROUP_FOUND
        elif request.method == "POST" and "/Users" in path:
            body = USER_CREATED
        elif request.method == "POST" and "/Groups" in path:
            body = GROUP_CREATED
        else:
            body = {}
        return 200, {}, json.dumps(body)

    rsps.add_callback(
        responses.GET,
        re.compile(re.escape(base) + r"/Users.*"),
        callback=log_request,
        content_type="application/json",
    )
    rsps.add_callback(
        responses.GET,
        re.compile(re.escape(base) + r"/Groups.*"),
        callback=log_request,
        content_type="application/json",
    )
    rsps.add_callback(
        responses.POST,
        re.compile(re.escape(base) + r"/Users.*"),
        callback=log_request,
        content_type="application/json",
    )
    rsps.add_callback(
        responses.POST,
        re.compile(re.escape(base) + r"/Groups.*"),
        callback=log_request,
        content_type="application/json",
    )


def _attach_remote_scim_services(collaboration: Collaboration, num_endpoints: int) -> List[Service]:
    services: List[Service] = []
    for index in range(num_endpoints):
        service = Service(
            entity_id=f"ENT-SCIM-REMOTE-{index:04d}",
            name=f"Remote SCIM {index}",
            abbreviation=f"scim{index}",
            description=f"Mock remote SCIM endpoint {index}",
            contact_email=f"scim{index}@example.org",
            accepted_user_policy="https://example.org/aup",
            privacy_policy="https://example.org/privacy",
            security_email=f"scim{index}@example.org",
            logo=read_image("testbeeld.png"),
            automatic_connection_allowed=True,
            scim_enabled=True,
            scim_client_enabled=True,
            scim_url=scim_remote_base_url(index),
        )
        services.append(service)
    collaboration.services = services
    persist_instance(db, *services)
    db.session.commit()
    return services


def _run_interleaved_broadcasts(
    collaboration_id: int,
    group_id: int,
    user_id: int,
    rounds: int,
) -> None:
    futures = []
    for _ in range(rounds):
        futures.append(broadcast_collaboration_changed(collaboration_id))
        futures.append(broadcast_group_changed(group_id))
        futures.append(broadcast_user_changed(user_id))
    for future in futures:
        future.result()


def _expected_task_sequence(rounds: int) -> List[str]:
    per_round = ["collaboration", "group", "user"]
    return per_round * rounds


def _expected_tasks_per_host(rounds: int) -> int:
    return rounds * SRAM_SCIM_EVENTS_PER_ROUND


def _expected_total_pool_tasks(num_endpoints: int, rounds: int) -> int:
    return num_endpoints * _expected_tasks_per_host(rounds)


def _assert_volume(
    task_log: Dict[str, List[str]],
    http_log: Dict[str, List[str]],
    hosts: Sequence[str],
    rounds: int,
    num_endpoints: int,
) -> None:
    case = unittest.TestCase()
    expected_per_host = _expected_tasks_per_host(rounds)
    total_tasks = sum(len(task_log.get(host, [])) for host in hosts)
    case.assertEqual(
        _expected_total_pool_tasks(num_endpoints, rounds),
        total_tasks,
        f"expected {num_endpoints} endpoints x {expected_per_host} tasks",
    )
    for host in hosts:
        case.assertGreaterEqual(
            len(http_log.get(host, [])),
            expected_per_host,
            f"expected HTTP evidence on {host}, got {len(http_log.get(host, []))} calls",
        )


def _assert_fifo_per_host(task_log: Dict[str, List[str]], hosts: Sequence[str], rounds: int) -> None:
    expected = _expected_task_sequence(rounds)
    for host in hosts:
        self_seq = task_log.get(host, [])
        unittest.TestCase().assertEqual(
            expected,
            self_seq,
            f"FIFO task order mismatch on {host}: got {self_seq}",
        )


def _run_fifo_broadcast_cycle(
    app: Flask,
    collaboration_id: int,
    group_id: int,
    user_id: int,
    rounds: int,
    num_endpoints: int,
    service_hosts: Dict[int, str],
) -> tuple[DefaultDict[str, List[str]], DefaultDict[str, List[str]]]:
    """One Gunicorn worker lifecycle: fresh FIFO pool, broadcasts, mocked HTTP."""
    task_log: DefaultDict[str, List[str]] = defaultdict(list)
    http_log: DefaultDict[str, List[str]] = defaultdict(list)
    lock = threading.Lock()

    with app.app_context():
        db.session.remove()
        reset_scim_fifo_pool(app)

        with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
            for index in range(num_endpoints):
                _register_endpoint_mocks(rsps, index, http_log, lock)

            record_collab = _make_recording_apply(
                scim_apply_module.apply_collaboration_change,
                "collaboration",
                task_log,
                lock,
                service_hosts,
            )
            record_group = _make_recording_apply(
                scim_apply_module.apply_group_change,
                "group",
                task_log,
                lock,
                service_hosts,
            )
            record_user = _make_recording_apply(
                scim_apply_module.apply_user_change,
                "user",
                task_log,
                lock,
                service_hosts,
            )

            with patch.object(scim_events_module, "apply_collaboration_change", record_collab), \
                    patch.object(scim_events_module, "apply_group_change", record_group), \
                    patch.object(scim_events_module, "apply_user_change", record_user):
                _run_interleaved_broadcasts(collaboration_id, group_id, user_id, rounds)

            ensure_scim_pool_idle(app, timeout=120.0)

    return task_log, http_log


class TestScimMultiEndpointFifo(AbstractTest):
    """
    N > pool workers: async SCIM FIFO pool with mocked remote SCIM HTTP endpoints.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        os.environ.pop("SCIM_DISABLED", None)
        _install_async_scim_pool(cls.app)

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            ensure_scim_pool_idle(cls.app)
        os.environ["SCIM_FIFO_SYNC"] = "1"
        os.environ["SCIM_DISABLED"] = "1"
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        with self.app.app_context():
            _install_async_scim_pool(self.app)
            collaboration = self.find_entity_by_name(Collaboration, co_research_name)
            group = self.find_entity_by_name(Group, group_science_name)
            user = self.find_entity_by_name(User, user_peter_name)
            self.clear_group_memberships(group)
            self.remote_services = _attach_remote_scim_services(
                collaboration, NUM_SCIM_ENDPOINTS
            )
            self.service_hosts = {
                service.id: scim_remote_host(index)
                for index, service in enumerate(self.remote_services)
            }
            self.collaboration_id = collaboration.id
            self.group_id = group.id
            self.user_id = user.id
        self.add_bearer_token_to_services()

    def tearDown(self):
        with self.app.app_context():
            ensure_scim_pool_idle(self.app)
        super().tearDown()

    @responses.activate
    def test_many_remote_scim_endpoints_fifo_async_pool(self):
        """
        One Gunicorn worker: N remote SCIM endpoints (N > pool threads), many SRAM-style
        collaboration/group/user broadcasts, async FIFO pool, mocked HTTP to every remote.
        """
        self.assertGreater(NUM_SCIM_ENDPOINTS, SCIM_FIFO_WORKERS)

        hosts = [scim_remote_host(i) for i in range(NUM_SCIM_ENDPOINTS)]
        task_log, http_log = _run_fifo_broadcast_cycle(
            self.app,
            self.collaboration_id,
            self.group_id,
            self.user_id,
            BROADCAST_ROUNDS,
            NUM_SCIM_ENDPOINTS,
            self.service_hosts,
        )

        _assert_fifo_per_host(task_log, hosts, BROADCAST_ROUNDS)
        _assert_volume(task_log, http_log, hosts, BROADCAST_ROUNDS, NUM_SCIM_ENDPOINTS)

    def test_two_gunicorn_worker_pools_fifo_per_endpoint(self):
        """
        Multiple Gunicorn workers => independent FIFO pool lifecycles (in-process reset).

        Each lifecycle replays a full burst of SRAM SCIM events to all N remotes. Eventlet
        prevents true multiprocessing here; pool isolation per lifecycle is what we verify.
        """
        self.assertGreater(NUM_SCIM_ENDPOINTS, SCIM_FIFO_WORKERS)
        hosts = [scim_remote_host(i) for i in range(NUM_SCIM_ENDPOINTS)]
        expected_total = _expected_total_pool_tasks(NUM_SCIM_ENDPOINTS, BROADCAST_ROUNDS)
        grand_total_tasks = 0

        for worker_index in range(NUM_GUNICORN_WORKERS):
            task_log, http_log = _run_fifo_broadcast_cycle(
                self.app,
                self.collaboration_id,
                self.group_id,
                self.user_id,
                BROADCAST_ROUNDS,
                NUM_SCIM_ENDPOINTS,
                self.service_hosts,
            )
            _assert_fifo_per_host(task_log, hosts, BROADCAST_ROUNDS)
            _assert_volume(task_log, http_log, hosts, BROADCAST_ROUNDS, NUM_SCIM_ENDPOINTS)
            grand_total_tasks += sum(len(task_log.get(host, [])) for host in hosts)

        self.assertEqual(
            expected_total * NUM_GUNICORN_WORKERS,
            grand_total_tasks,
            "each worker lifecycle should process all endpoint queues",
        )


if __name__ == "__main__":
    unittest.main()
