from __future__ import annotations

import logging
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Deque, Dict, Hashable, Tuple

Task = Tuple[Callable[..., Any], tuple, dict]


class FifoPool:
    def __init__(self, max_workers: int = 4, logger: logging.Logger | None = None):
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._logger = logger or logging.getLogger("scim_sequencer")
        self._lock = threading.Lock()
        self._queues: Dict[Hashable, Deque[Task]] = {}
        self._active_keys: set[Hashable] = set()

    def submit(self, key: Hashable, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
        with self._lock:
            queue = self._queues.setdefault(key, deque())
            queue.append((fn, args, kwargs))
            if key in self._active_keys:
                return
            self._active_keys.add(key)
        self._executor.submit(self._drain_key, key)

    def _drain_key(self, key: Hashable) -> None:
        try:
            while True:
                with self._lock:
                    queue = self._queues.get(key)
                    if not queue:
                        self._queues.pop(key, None)
                        self._active_keys.discard(key)
                        return
                    fn, args, kwargs = queue.popleft()

                try:
                    fn(*args, **kwargs)
                except Exception:
                    self._logger.exception("Error while processing FIFO task for %s", key)
        finally:
            with self._lock:
                if key not in self._queues:
                    self._active_keys.discard(key)

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)
