#!/usr/bin/env python3
"""
Produce readable evidence that SCIM processing is:
  - FIFO per SCIM receiver (endpoint URL)
  - Parallel across different receivers

Run in the server container:
  docker exec sbs-server python /opt/server/scripts/scim_fifo_evidence.py
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

PASS = "PASS"
FAIL = "FAIL"


def _header(title: str) -> None:
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def evidence_fifo_per_receiver() -> bool:
    """Same endpoint: slow tasks must complete in submission order."""
    from server.scim.fifo_pool import FifoPool

    _header("1. FIFO per SCIM receiver (single endpoint)")
    pool = FifoPool(max_workers=4)
    endpoint = "http://scim-receiver-a.example/scim"
    submitted = list(range(1, 6))
    processed: list[int] = []
    lock = threading.Lock()
    done = threading.Event()

    def task(seq: int) -> None:
        time.sleep(0.03)
        with lock:
            processed.append(seq)
            if seq == submitted[-1]:
                done.set()

    print(f"Receiver: {endpoint}")
    print(f"Submitted sequence: {submitted}")
    for seq in submitted:
        pool.submit(endpoint, task, seq)

    ok = done.wait(timeout=5)
    pool.shutdown(wait=True)
    print(f"Processed sequence: {processed}")
    passed = ok and processed == submitted
    print(f"{PASS if passed else FAIL}: "
          f"{'order preserved' if passed else 'order violated — parallel workers reordered same-endpoint tasks'}")
    return passed


def evidence_parallel_across_receivers() -> bool:
    """Different endpoints: overlapping execution windows."""
    from server.scim.fifo_pool import FifoPool

    _header("2. Parallel across SCIM receivers (two endpoints)")
    pool = FifoPool(max_workers=4)
    endpoint_a = "http://scim-receiver-a.example/scim"
    endpoint_b = "http://scim-receiver-b.example/scim"
    release = threading.Event()
    timeline: list[tuple[float, str]] = []
    lock = threading.Lock()

    def slow_task(label: str) -> None:
        with lock:
            timeline.append((time.monotonic(), f"{label}-start"))
        if not release.wait(timeout=5):
            raise TimeoutError(label)
        with lock:
            timeline.append((time.monotonic(), f"{label}-end"))

    print(f"Receiver A: {endpoint_a}")
    print(f"Receiver B: {endpoint_b}")
    print("Both tasks block until released (simulates slow SCIM HTTP)...")

    t0 = time.monotonic()
    pool.submit(endpoint_a, slow_task, "A")
    pool.submit(endpoint_b, slow_task, "B")

    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        labels = {e for _, e in timeline}
        if "A-start" in labels and "B-start" in labels:
            break
        time.sleep(0.005)
    else:
        pool.shutdown(wait=True)
        print(f"{FAIL}: both receivers did not start within 5s")
        return False

    overlap_at = time.monotonic()
    release.set()
    time.sleep(0.05)
    pool.shutdown(wait=True)

    base = timeline[0][0]
    print("Timeline (seconds from first event):")
    for ts, event in timeline:
        print(f"  +{(ts - base) * 1000:6.0f} ms  {event}")

    events = [e for _, e in timeline]
    a_start = next(t for t, e in timeline if e == "A-start")
    b_start = next(t for t, e in timeline if e == "B-start")
    a_end = next(t for t, e in timeline if e == "A-end")
    b_end = next(t for t, e in timeline if e == "B-end")

    overlap_ms = (min(a_end, b_end) - max(a_start, b_start)) * 1000
    both_started_before_either_ended = max(a_start, b_start) < min(a_end, b_end)
    passed = (
        "A-start" in events and "B-start" in events
        and both_started_before_either_ended
        and overlap_ms > 0
    )
    print(f"Concurrent overlap: {overlap_ms:.0f} ms")
    print(f"{PASS if passed else FAIL}: "
          f"{'both receivers ran concurrently' if passed else 'receivers did not overlap'}")
    return passed


def evidence_redis_pipeline_fifo() -> bool:
    """Production path: broadcast -> enqueue -> FifoPool drain -> dispatcher (mocked apply)."""
    from unittest.mock import patch

    os.environ["SCIM_DISABLED"] = "1"
    from server.__main__ import app
    from server.db.domain import Collaboration, Group
    from server.scim.dispatcher import dispatch_scim_task
    from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed
    from server.scim.fifo_pool import FifoPool
    from server.test.seed import co_research_name, group_science_name

    _header("3. FIFO per receiver (broadcast → enqueue → FifoPool → dispatcher)")

    with app.app_context():
        os.environ.pop("SCIM_DISABLED", None)
        collaboration = Collaboration.query.filter(Collaboration.name == co_research_name).one()
        group = Group.query.filter(Group.name == group_science_name).one()

        call_log: list[str] = []
        captured: list[tuple[str, str]] = []
        log_lock = threading.Lock()

        def capture_enqueue(_queue, endpoint_url, payload_json):
            captured.append((endpoint_url, payload_json))
            return True

        def record_collab(*_a, **_k):
            time.sleep(0.05)
            with log_lock:
                call_log.append("collaboration_changed")

        def record_group(*_a, **_k):
            with log_lock:
                call_log.append("group_changed")

        expected = []
        n = 5
        with patch("server.scim.events.ScimQueue.enqueue_by_endpoint", autospec=True, side_effect=capture_enqueue), \
                patch("server.scim.dispatcher.apply_collaboration_change", side_effect=record_collab), \
                patch("server.scim.dispatcher.apply_group_change", side_effect=record_group):
            for _ in range(n):
                broadcast_collaboration_changed(collaboration.id)
                broadcast_group_changed(group.id)
                expected.extend(["collaboration_changed", "group_changed"])

            pool = FifoPool(max_workers=4)
            for _endpoint_url, payload_json in captured:
                pool.submit(
                    _endpoint_url,
                    lambda p=payload_json: dispatch_scim_task(app, p),
                )
            pool.shutdown(wait=True)

        receivers = sorted({ep for ep, _ in captured})
        print(f"Receivers: {receivers}")
        print(f"Enqueued {n}×(collaboration, group) interleaved on the same SCIM URL")
        print(f"Expected dispatch order: {expected}")
        print(f"Actual dispatch order:   {call_log}")
        passed = call_log == expected and len(captured) == len(expected)
        print(f"{PASS if passed else FAIL}: "
              f"{'collaboration always before group' if passed else 'ordering violated'}")
        return passed


def main() -> int:
    results = [
        ("FIFO per receiver (FifoPool)", evidence_fifo_per_receiver()),
        ("Parallel across receivers (FifoPool)", evidence_parallel_across_receivers()),
        ("FIFO per receiver (Redis + drain)", evidence_redis_pipeline_fifo()),
    ]
    _header("Summary")
    all_ok = True
    for name, ok in results:
        print(f"  [{PASS if ok else FAIL}] {name}")
        all_ok = all_ok and ok
    print()
    if all_ok:
        print("All evidence checks passed.")
        return 0
    print("Some checks failed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
