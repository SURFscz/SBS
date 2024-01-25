import logging
import os
from datetime import datetime, timezone
from os.path import exists

from werkzeug.exceptions import BadRequest

logger = logging.getLogger("main")


def read_file(file_name: str) -> str:
    file = file_name if file_name.startswith("/") else f"{os.path.dirname(os.path.realpath(__file__))}/{file_name}"
    if exists(file):
        logger.debug(f"reading file '{file}'")
        with open(file) as f:
            return f.read()
    else:
        raise BadRequest(f"Can't read file: {file_name}")


def dt_now() -> datetime:
    return datetime.now(timezone.utc)


def dt_today() -> datetime:
    return dt_now().replace(hour=0, minute=0, second=0, microsecond=0)
