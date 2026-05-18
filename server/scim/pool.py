from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

from server.scim.fifo_pool import FifoPool

if TYPE_CHECKING:
    from flask import Flask


def init_scim_fifo_pool(app: Flask) -> FifoPool:
    max_workers = int(os.environ.get("SCIM_FIFO_WORKERS", "4"))
    logger = logging.getLogger("scim_fifo_pool")
    pool = FifoPool(max_workers=max_workers, logger=logger)
    app.scim_fifo_pool = pool
    logger.info("SCIM FIFO pool configured with %s workers", max_workers)
    return pool


def reset_scim_fifo_pool(app: Flask) -> FifoPool:
    """Shut down the current pool (waiting for in-flight SCIM) and start a fresh one."""
    pool = getattr(app, "scim_fifo_pool", None)
    if pool is not None:
        pool.shutdown(wait=True)
    return init_scim_fifo_pool(app)


def ensure_scim_pool_idle(app: Flask, timeout: float = 30.0) -> None:
    """Wait for queued SCIM work to finish; reset the pool if it does not drain in time."""
    pool = getattr(app, "scim_fifo_pool", None)
    if pool is None:
        return
    try:
        pool.join_idle(timeout)
    except TimeoutError:
        reset_scim_fifo_pool(app)
