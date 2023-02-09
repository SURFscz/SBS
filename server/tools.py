import logging
import os
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
        raise BadRequest()
