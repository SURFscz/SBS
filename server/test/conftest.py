# make sure we monkey_patch right at the start, before other imports
# see https://github.com/miguelgrinberg/Flask-SocketIO/issues/806
# and https://github.com/eventlet/eventlet/issues/896

import os
import re

import sqlalchemy
import pytest
import yaml
from munch import munchify

from server.db.db import db_migrations
from server.tools import read_file
from server.scim.schema_template import init_scim_schemas


def pytest_sessionstart():
    import eventlet

    eventlet.monkey_patch(thread=False)


@pytest.fixture(autouse=True, scope='session')
def use_random_db(request, worker_id):
    if worker_id == "master":
        return

    # make sure we use a separate DB for each worker
    # and make sure the database is created and migrated

    config_file = os.environ.get("CONFIG", "config/test_config.yml")
    config = munchify(yaml.load(read_file(config_file), Loader=yaml.FullLoader))
    database_uri_root = re.sub(r"/sbs_test\b", "/", config.database.uri)
    database_uri = re.sub(r"/sbs_test\b", f"/sbs_{worker_id}", config.database.uri)

    engine = sqlalchemy.create_engine(database_uri_root)
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text(f"CREATE DATABASE IF NOT EXISTS sbs_{worker_id}"))

    # not sure why, but this is not picked up from AbstractTest.setUpClass
    # and we need it in some of the migrations
    os.environ["CONFIG"] = os.environ.get("CONFIG", "config/test_config.yml")

    os.environ['SBS_DB_URI_OVERRIDE'] = database_uri
    db_migrations(database_uri)

    if hasattr(config, 'scim_schema_sram'):
        init_scim_schemas(config.scim_schema_sram)
