import logging
import os

logger = logging.getLogger("main")


def read_file(file_name: str) -> str:
    file = f"{os.path.dirname(os.path.realpath(__file__))}/{file_name}"
    logger.debug(f"reading file '{file}'")
    with open(file) as f:
        return f.read()
