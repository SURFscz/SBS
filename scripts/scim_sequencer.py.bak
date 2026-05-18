#!/usr/bin/env python3
"""
Simple SCIM sequencer worker: polls per-service Redis queues `scim:queue:service:{id}`
and processes tasks one-by-one while holding a per-service distributed lock.

Usage: run alongside your SBS app environment so `server.__main__.app` can be imported.
"""
import json
import time
import uuid
import logging
import threading
from typing import Optional
from collections import deque
from concurrent.futures import ThreadPoolExecutor

from server.__main__ import app

# Redis lock scripts
_RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
"""

_EXTEND_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
"""


class RedisLock:
    def __init__(self, redis_client, key: str, ttl_ms: int = 60000, wait_timeout: float = 5.0, retry_delay: float = 0.05):
        self.redis = redis_client
        self.key = key
        self.ttl_ms = int(ttl_ms)
        self.wait_timeout = wait_timeout
        self.retry_delay = retry_delay
        self.token: Optional[str] = None

    def acquire(self) -> Optional[str]:
        end = time.time() + self.wait_timeout
        token = str(uuid.uuid4())
        while time.time() < end:
            ok = self.redis.set(self.key, token, nx=True, px=self.ttl_ms)
            if ok:
                self.token = token
                return token
            time.sleep(self.retry_delay)
        return None

    def release(self):
        if not self.token:
            return False
        try:
            res = self.redis.eval(_RELEASE_SCRIPT, 1, self.key, self.token)
            self.token = None
            return res == 1
        except Exception:
            return False

    def extend(self, ttl_ms: int):
        if not self.token:
            return False
        try:
            res = self.redis.eval(_EXTEND_SCRIPT, 1, self.key, self.token, int(ttl_ms))
            return res == 1
        except Exception:
            return False

    def __enter__(self):
        if not self.acquire():
            raise TimeoutError(f"Failed to acquire lock {self.key}")
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            self.release()
        except Exception:
            pass


def process_payload(app, payload: dict):
    # Call the same handlers the app would have used when broadcasting
    from server.scim.scim import (
        apply_user_change,
        apply_user_deletion,
        apply_collaboration_change,
        apply_group_change,
        apply_service_changed,
        apply_organisation_change,
    )

    action = payload.get("action")
    try:
        if action == "user_changed":
            apply_user_change(app, payload["user_id"])  # apply_user_change(app, user_id)
        elif action == "user_deleted":
            apply_user_deletion(app, payload.get("external_id"), payload.get("collaboration_ids", []))
        elif action in ("collaboration_changed", "collaboration_deleted"):
            apply_collaboration_change(app, payload.get("collaboration_id"), bool(payload.get("deletion", False)))
        elif action in ("group_changed", "group_deleted"):
            apply_group_change(app, payload.get("group_id"), bool(payload.get("deletion", False)))
        elif action == "service_changed":
            apply_service_changed(app, payload.get("collaboration_id"), payload.get("service_id"), bool(payload.get("deletion", False)))
        elif action == "organisation_deleted":
            apply_organisation_change(app, payload.get("organisation_id"), bool(payload.get("deletion", False)))
        else:
            logging.getLogger("scim_sequencer").warning(f"Unknown SCIM action: {action}")
    except Exception:
        logging.getLogger("scim_sequencer").exception("Error while processing SCIM payload")


def run_loop():
    logger = logging.getLogger("scim_sequencer")
    redis_client = app.redis_client
    logger.info("Starting SCIM sequencer (dispatcher + worker threads)")

    # Per-service in-memory buffers and processing set to ensure strict FIFO per service
    service_buffers = {}  # service_id -> deque
    processing_services = set()
    dict_lock = threading.Lock()

    max_workers = int(app.app_config.get("scim_sequencer_threads", 4)) if hasattr(app, 'app_config') else 4
    executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit_for_service(service_id: int, first_payload: dict):
        def worker():
            logger.info("Worker started for service %s", service_id)
            try:
                # process initial payload and then drain the service buffer sequentially
                with app.app_context():
                    process_payload(app, first_payload)
                    while True:
                        next_payload = None
                        with dict_lock:
                            buf = service_buffers.get(service_id)
                            if buf and len(buf) > 0:
                                next_payload = buf.popleft()
                            else:
                                # no more items for this service
                                processing_services.discard(service_id)
                                # cleanup empty buffer
                                if buf is not None and len(buf) == 0:
                                    service_buffers.pop(service_id, None)
                                break
                        # process next_payload outside the lock
                        try:
                            with app.app_context():
                                process_payload(app, next_payload)
                        except Exception:
                            logger.exception("Error processing payload for service %s", service_id)
                            # On error, continue to next payload (handlers should be idempotent)
            finally:
                logger.info("Worker finished for service %s", service_id)

        executor.submit(worker)

    try:
        while True:
            try:
                # discover active per-service queues
                keys = redis_client.keys("scim:queue:service:*")
                if not keys:
                    time.sleep(1)
                    continue
                # normalize keys to str
                keys = [k.decode() if isinstance(k, bytes) else k for k in keys]
                # BLPOP to pop head (FIFO) from any service queue
                res = redis_client.blpop(keys, timeout=5)
                if not res:
                    continue
                queue_key, raw = res
                queue_key = queue_key.decode() if isinstance(queue_key, bytes) else queue_key
                raw = raw.decode() if isinstance(raw, bytes) else raw
                try:
                    payload = json.loads(raw)
                except Exception:
                    logger.exception("Invalid JSON payload popped from %s", queue_key)
                    continue

                # extract service id from key
                try:
                    service_id = int(queue_key.rsplit(":", 1)[-1])
                except Exception:
                    logger.exception("Could not parse service id from key %s", queue_key)
                    continue

                # dispatch to worker if service not currently processing, otherwise buffer
                with dict_lock:
                    if service_id not in processing_services:
                        processing_services.add(service_id)
                        # ensure buffer exists
                        if service_id not in service_buffers:
                            service_buffers[service_id] = deque()
                        # submit first payload to start processing
                        submit_for_service(service_id, payload)
                    else:
                        # append to buffer to maintain FIFO
                        if service_id not in service_buffers:
                            service_buffers[service_id] = deque()
                        service_buffers[service_id].append(payload)

            except KeyboardInterrupt:
                logger.info("SCIM sequencer stopped by user")
                break
            except Exception:
                logging.getLogger("scim_sequencer").exception("Unexpected error in sequencer loop")
                time.sleep(1)
    finally:
        executor.shutdown(wait=True)


if __name__ == "__main__":
    run_loop()
