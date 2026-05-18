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
