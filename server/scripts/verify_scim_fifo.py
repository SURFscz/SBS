#!/usr/bin/env python3
"""
Verify SCIM FIFO sequencing against a running SBS server (e.g. docker compose).

Checks:
  1. SCIM tasks enqueue to Redis per-endpoint keys
  2. The background FifoPool drains queues (length returns to 0)
  3. scim_mock receives HTTP traffic after broadcasts

Run inside the server container:
  docker exec sbs-server python /opt/server/scripts/verify_scim_fifo.py
"""
from __future__ import annotations

import json
import os
import sys
import time

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)


def _redis_queue_lengths(redis_client) -> dict[str, int]:
    from server.scim.queue import SCIM_QUEUE_PREFIX, endpoint_from_queue_key

    stats = {}
    for key in redis_client.keys(f"{SCIM_QUEUE_PREFIX}*"):
        key_str = key.decode("utf-8") if isinstance(key, bytes) else key
        length = redis_client.llen(key)
        if length:
            stats[endpoint_from_queue_key(key_str)] = int(length)
    return stats


def main() -> int:
    # Do not start a second FIFO consumer in this process; rely on the running server worker.
    os.environ["SCIM_DISABLED"] = "1"
    from server.__main__ import app
    from server.db.domain import Collaboration, Group
    from server.scim.events import broadcast_collaboration_changed, broadcast_group_changed
    from server.scim.queue import SCIM_QUEUE_PREFIX
    from server.test.seed import co_research_name, group_science_name

    os.environ.pop("SCIM_DISABLED", None)

    with app.app_context():
        collaboration = Collaboration.query.filter(Collaboration.name == co_research_name).one()
        group = Group.query.filter(Group.name == group_science_name).one()

        redis_client = app.redis_client
        for key in redis_client.keys(f"{SCIM_QUEUE_PREFIX}*"):
            redis_client.delete(key)

        print("Enqueueing 3 collaboration + 3 group SCIM tasks...")
        for _ in range(3):
            broadcast_collaboration_changed(collaboration.id)
            broadcast_group_changed(group.id)

        lengths_after_enqueue = _redis_queue_lengths(redis_client)
        total_enqueued = sum(lengths_after_enqueue.values())
        if lengths_after_enqueue:
            print(f"  Redis queues: {lengths_after_enqueue} ({total_enqueued} tasks pending)")
        else:
            print("  Redis queues already empty right after enqueue "
                  "(background worker drained immediately — OK if running server has FIFO pool)")

        print("Waiting for background SCIM FIFO pool to drain queues (timeout 30s)...")
        deadline = time.time() + 30
        while time.time() < deadline:
            remaining = _redis_queue_lengths(redis_client)
            if not remaining:
                break
            time.sleep(0.25)
        else:
            print(f"FAIL: queues not drained in time, still pending: {remaining}")
            print("Hint: restart sbs-server after deploying the FIFO pool fix (TESTING=1 no longer disables it).")
            return 1

        print("  All per-endpoint queues drained.")

        from server.api.mock_scim import HTTP_CALLS_KEY

        raw = redis_client.get(HTTP_CALLS_KEY)
        http_calls = json.loads(raw) if raw else {}
        total_calls = sum(len(v) for v in http_calls.values())
        if total_calls == 0:
            print("FAIL: scim_mock has no recorded HTTP calls (check server logs for SCIM errors)")
            return 1

        print(f"  scim_mock recorded {total_calls} HTTP call(s) across {len(http_calls)} service(s).")
        print("OK: running server drained SCIM queues and reached scim_mock.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
