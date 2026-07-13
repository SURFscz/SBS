"""
Benchmark: SCIM FIFO pool – single worker (before) vs parallel workers (after).

Reproduces exactly the workload from test_multi_endpoint_fifo but measures
wall-clock time for each worker-count configuration so we can see the speedup.

Run from the server/ directory:

    CONFIG=config/test_config.yml \
    SCIM_DISABLED=0 \
    python -m server.test.scim.bench_fifo_workers

Or via pytest (discovery is suppressed by the leading bench_ name, run explicitly):

    pytest server/test/scim/bench_fifo_workers.py -s -v
"""

from __future__ import annotations

import json
import os
import re
import sys
import threading
import time
from collections import defaultdict
from typing import Any, Callable, DefaultDict, Dict, List
from unittest.mock import patch
from urllib.parse import urlparse

# ── minimal Flask/app bootstrap ──────────────────────────────────────────────
os.environ.setdefault("CONFIG", "config/test_config.yml")
os.environ.setdefault("TESTING", "1")
os.environ.pop("SCIM_DISABLED", None)   # any non-empty value disables broadcasts
# Start in sync mode; each run will switch to async and reset the pool.
os.environ["SCIM_FIFO_SYNC"] = "1"

import eventlet  # noqa: E402  (must come before other imports)
eventlet.monkey_patch(thread=False)

from server.__main__ import app  # noqa: E402
from server.db.db import db  # noqa: E402
from server.db.domain import Collaboration, Group, User  # noqa: E402
from server.scim import events as scim_events_module  # noqa: E402
from server.scim import scim as scim_apply_module  # noqa: E402
from server.scim.events import (  # noqa: E402
    broadcast_collaboration_changed,
    broadcast_group_changed,
    broadcast_user_changed,
)
from server.scim.pool import ensure_scim_pool_idle, reset_scim_fifo_pool  # noqa: E402
from server.auth.tokens import encrypt_scim_bearer_token  # noqa: E402
from server.test.seed import (  # noqa: E402
    co_research_name,
    group_science_name,
    persist_instance,
    read_image,
    seed,
    user_peter_name,
)
from server.db.domain import Service  # noqa: E402
from server.tools import read_file  # noqa: E402
from server.auth.tokens import encrypt_scim_bearer_token  # noqa: E402

try:
    import responses  # noqa: E402
except ImportError:
    print("pip install responses  (test dependency required)", file=sys.stderr)
    sys.exit(1)

# ── workload constants (match test_multi_endpoint_fifo) ──────────────────────
NUM_SCIM_ENDPOINTS = 16
BROADCAST_ROUNDS = 12
SRAM_SCIM_EVENTS_PER_ROUND = 3  # collaboration + group + user

NO_USER_FOUND = json.loads(read_file("test/scim/no_user_found.json"))
NO_GROUP_FOUND = json.loads(read_file("test/scim/no_user_found.json"))
GROUP_CREATED = json.loads(read_file("test/scim/group_created.json"))
USER_CREATED = json.loads(read_file("test/scim/user_created.json"))

# Worker counts to benchmark: 1 represents "before" (sequential per endpoint),
# everything above 1 exercises the parallel-FIFO path.
WORKER_COUNTS = [1, 2, 4, 8]


# ── helpers (mirrors test_multi_endpoint_fifo) ────────────────────────────────

def _base_url(i: int) -> str:
    return f"http://scim-bench-{i}.test/scim"


def _host(i: int) -> str:
    return urlparse(_base_url(i)).netloc


def _attach_remote_services(collaboration: Collaboration, n: int) -> List[Service]:
    services: List[Service] = []
    for i in range(n):
        svc = Service(
            entity_id=f"BENCH-SCIM-{i:04d}",
            name=f"Bench SCIM {i}",
            abbreviation=f"bscim{i}",
            description=f"Bench remote SCIM endpoint {i}",
            contact_email=f"bench{i}@example.org",
            accepted_user_policy="https://example.org/aup",
            privacy_policy="https://example.org/privacy",
            security_email=f"bench{i}@example.org",
            logo=read_image("testbeeld.png"),
            automatic_connection_allowed=True,
            scim_enabled=True,
            scim_client_enabled=True,
            scim_url=_base_url(i),
        )
        services.append(svc)
    collaboration.services = services
    persist_instance(db, *services)
    db.session.commit()
    return services


def _install_mock_responses(rsps: responses.RequestsMock, n: int) -> None:
    for i in range(n):
        base = _base_url(i)

        def _cb(request: Any, _base=base) -> tuple[int, dict, str]:
            path = urlparse(request.url).path
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

        for method, pattern in [
            (responses.GET, re.compile(re.escape(base) + r"/Users.*")),
            (responses.GET, re.compile(re.escape(base) + r"/Groups.*")),
            (responses.POST, re.compile(re.escape(base) + r"/Users.*")),
            (responses.POST, re.compile(re.escape(base) + r"/Groups.*")),
        ]:
            rsps.add_callback(method, pattern, callback=_cb, content_type="application/json")


def _recording_wrapper(
    real_fn: Callable[..., Any],
    label: str,
    task_log: Dict[str, List[str]],
    lock: threading.Lock,
    service_hosts: Dict[int, str],
) -> Callable[..., Any]:
    def wrapper(app_obj, *args, **kwargs):
        service_ids = kwargs.get("service_ids")
        if service_ids is None and args and isinstance(args[-1], list):
            service_ids = args[-1]
            args = args[:-1]
        if service_ids:
            host = service_hosts[service_ids[0]]
            with lock:
                task_log[host].append(label)
        return real_fn(app_obj, *args, service_ids=service_ids)
    return wrapper


def _run_broadcast_cycle(
    collab_id: int,
    group_id: int,
    user_id: int,
    rounds: int,
    num_endpoints: int,
    service_hosts: Dict[int, str],
) -> tuple[float, DefaultDict[str, List[str]]]:
    """Return (elapsed_seconds, task_log)."""
    task_log: DefaultDict[str, List[str]] = defaultdict(list)
    lock = threading.Lock()

    with app.app_context():
        db.session.remove()
        reset_scim_fifo_pool(app)

        with responses.RequestsMock(assert_all_requests_are_fired=False) as rsps:
            _install_mock_responses(rsps, num_endpoints)

            record_collab = _recording_wrapper(
                scim_apply_module.apply_collaboration_change, "collaboration", task_log, lock, service_hosts
            )
            record_group = _recording_wrapper(
                scim_apply_module.apply_group_change, "group", task_log, lock, service_hosts
            )
            record_user = _recording_wrapper(
                scim_apply_module.apply_user_change, "user", task_log, lock, service_hosts
            )

            with (
                patch.object(scim_events_module, "apply_collaboration_change", record_collab),
                patch.object(scim_events_module, "apply_group_change", record_group),
                patch.object(scim_events_module, "apply_user_change", record_user),
            ):
                t0 = time.monotonic()
                futures = []
                for _ in range(rounds):
                    futures.append(broadcast_collaboration_changed(collab_id))
                    futures.append(broadcast_group_changed(group_id))
                    futures.append(broadcast_user_changed(user_id))
                for f in futures:
                    f.result()
                ensure_scim_pool_idle(app, timeout=120.0)
                elapsed = time.monotonic() - t0

    return elapsed, task_log


def _assert_fifo(task_log: DefaultDict[str, List[str]], hosts: List[str], rounds: int) -> None:
    expected = ["collaboration", "group", "user"] * rounds
    for host in hosts:
        actual = task_log.get(host, [])
        assert actual == expected, f"FIFO violation on {host}: {actual!r}"


# ── main benchmark loop ───────────────────────────────────────────────────────

def run_benchmark() -> None:
    config = app.app_config
    config["profile"] = None
    config.test = True

    print(f"\n{'=' * 64}")
    print(" SCIM FIFO Worker Benchmark")
    print(f" Endpoints : {NUM_SCIM_ENDPOINTS}   Rounds : {BROADCAST_ROUNDS}")
    print(f" Tasks     : {NUM_SCIM_ENDPOINTS * BROADCAST_ROUNDS * SRAM_SCIM_EVENTS_PER_ROUND} total")
    print(f"{'=' * 64}\n")

    # Seed the database once.
    with app.app_context():
        seed(db, config)
        collaboration = Collaboration.query.filter_by(name=co_research_name).one()
        group = Group.query.filter_by(name=group_science_name).one()
        user = User.query.filter_by(name=user_peter_name).one()
        # Wipe stale group memberships (seed creates them; SCIM apply needs clean state)
        group.members = []
        db.session.commit()

        services = _attach_remote_services(collaboration, NUM_SCIM_ENDPOINTS)
        service_hosts = {svc.id: _host(i) for i, svc in enumerate(services)}

        # Add bearer tokens expected by scim_apply
        # Set encrypted SCIM bearer token directly on each service (mirrors the
        # reset_scim_bearer_token API used by test_multi_endpoint_fifo).
        for svc in services:
            svc.scim_bearer_token = "benchmark_secret"
            encrypt_scim_bearer_token(svc)
        db.session.commit()

        collab_id = collaboration.id
        group_id = group.id
        user_id = user.id

    hosts = [_host(i) for i in range(NUM_SCIM_ENDPOINTS)]
    results: list[tuple[int, float, bool]] = []

    baseline_elapsed: float | None = None

    # Ensure SCIM broadcasts are enabled for every run.
    os.environ.pop("SCIM_DISABLED", None)

    for workers in WORKER_COUNTS:
        label = "before (serial)" if workers == 1 else f"{workers} workers"
        print(f"  Running  {label:20s} ...", end="", flush=True)

        os.environ.pop("SCIM_FIFO_SYNC", None)
        os.environ["SCIM_FIFO_WORKERS"] = str(workers)

        elapsed, task_log = _run_broadcast_cycle(
            collab_id, group_id, user_id,
            BROADCAST_ROUNDS, NUM_SCIM_ENDPOINTS, service_hosts,
        )

        # Verify correctness for every run.
        ok = True
        try:
            _assert_fifo(task_log, hosts, BROADCAST_ROUNDS)
        except AssertionError as exc:
            ok = False
            print(f" FIFO VIOLATION: {exc}", file=sys.stderr)

        results.append((workers, elapsed, ok))
        if baseline_elapsed is None:
            baseline_elapsed = elapsed
        print(f" done  {elapsed:.2f}s")

    # ── print comparison table ────────────────────────────────────────────────
    print(f"\n{'─' * 64}")
    print(f"  {'Workers':<12} {'Time (s)':<12} {'vs 1-worker':<14} {'FIFO OK'}")
    print(f"{'─' * 64}")
    for workers, elapsed, ok in results:
        speedup = (baseline_elapsed / elapsed) if baseline_elapsed and elapsed > 0 else float("nan")
        label = "before (serial)" if workers == 1 else f"{workers:>2d} workers"
        check = "YES" if ok else "FAIL"
        print(f"  {label:<16} {elapsed:<12.2f} {speedup:<14.2f} {check}")
    print(f"{'─' * 64}\n")

    any_failed = any(not ok for _, _, ok in results)
    if any_failed:
        print("FIFO ordering was violated in at least one run.", file=sys.stderr)
        sys.exit(1)
    print("All FIFO ordering assertions passed.")


if __name__ == "__main__":
    run_benchmark()
