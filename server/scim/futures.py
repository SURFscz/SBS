from __future__ import annotations

from concurrent.futures import Future
from typing import Sequence


class ScimBroadcastFuture:
    """Waits for one or more per-endpoint SCIM tasks (API-compatible with executor futures)."""

    def __init__(self, futures: Sequence[Future]):
        self._futures = list(futures)

    def result(self, timeout: float | None = None):
        last_result = None
        for future in self._futures:
            last_result = future.result(timeout=timeout)
        return last_result
