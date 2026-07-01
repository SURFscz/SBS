from __future__ import annotations

import logging
import threading
import time
from collections import deque
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Any, Callable, Deque, Dict, Hashable, Tuple

Task = Tuple[Callable[..., Any], tuple, dict]


class FifoPool:
    """Per-key FIFO task queue with a shared thread pool (parallel across keys)."""

    def __init__(self, max_workers: int = 4, logger: logging.Logger | None = None):
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._logger = logger or logging.getLogger("scim_fifo_pool")
        self._lock = threading.Lock()
        self._queues: Dict[Hashable, Deque[Task]] = {}
        self._active_keys: set[Hashable] = set()

    def submit(self, key: Hashable, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Future:
        future: Future = Future()
        with self._lock:
            queue = self._queues.setdefault(key, deque())
            queue.append((fn, args, kwargs, future))
            if key in self._active_keys:
                return future
            self._active_keys.add(key)
        self._executor.submit(self._drain_key, key)
        return future

    def _drain_key(self, key: Hashable) -> None:
        try:
            while True:
                with self._lock:
                    queue = self._queues.get(key)
                    if not queue:
                        self._queues.pop(key, None)
                        self._active_keys.discard(key)
                        return
                    fn, args, kwargs, future = queue.popleft()

                try:
                    result = fn(*args, **kwargs)
                except Exception as exc:
                    self._logger.exception("Error while processing FIFO task for %s", key)
                    future.set_exception(exc)
                else:
                    future.set_result(result)
        finally:
            with self._lock:
                if key not in self._queues:
                    self._active_keys.discard(key)

    def join_idle(self, timeout: float = 30.0) -> None:
        """Block until all per-key queues are drained (for tests / teardown)."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self._lock:
                if not self._queues and not self._active_keys:
                    return
            time.sleep(0.01)
        raise TimeoutError(f"FifoPool still busy after {timeout}s")

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)
