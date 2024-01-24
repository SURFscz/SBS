# make sure we monkey_patch right at the start, before other imports
# see https://github.com/miguelgrinberg/Flask-SocketIO/issues/806
# and https://github.com/eventlet/eventlet/issues/896

import logging
import os
import re

import sqlalchemy
import pytest
import yaml
from munch import munchify

from server.db.db import db_migrations
from server.tools import read_file


def pytest_sessionstart():
    import eventlet

    eventlet.monkey_patch(thread=False)


@pytest.fixture(autouse=True, scope='session')
def use_random_db(request, worker_id):
    logging.error(f"random_db fixture called: {worker_id}")

    if worker_id == "master":
        return

    # make sure we use a separate DB for each worker
    # and make sure the database is created and migrated

    config_file = os.environ.get("CONFIG", "config/test_config.yml")
    config = munchify(yaml.load(read_file(config_file), Loader=yaml.FullLoader))
    database_uri_root = re.sub(r"/sbs_test\b", "/", config.database.uri)
    database_uri = re.sub(r"/sbs_test\b", f"/sbs_{worker_id}", config.database.uri)

    with open(f'/tmp/pytest_{worker_id}', 'a') as f:
        f.write(f"{worker_id}\n{database_uri}\n")

    engine = sqlalchemy.create_engine(database_uri_root)
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text(f"CREATE DATABASE IF NOT EXISTS sbs_{worker_id}"))

    os.environ['SBS_DB_URI_OVERRIDE'] = database_uri
    db_migrations(database_uri)
