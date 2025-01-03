import logging
import os
from datetime import datetime, timezone
from os.path import exists

from werkzeug.exceptions import BadRequest

logger = logging.getLogger("main")

WEEK = 7
MONTH = 30
YEAR = 365


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


def inactivity(inactive_days):
    def res(days, interval):
        (div, mod) = divmod(days, interval)
        return div * interval

    if inactive_days >= YEAR:
        return res(inactive_days, YEAR)
    elif inactive_days >= MONTH:
        return res(inactive_days, MONTH)
    elif inactive_days >= WEEK:
        return res(inactive_days, WEEK)
    else:
        return 1
