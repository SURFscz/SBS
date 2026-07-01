# make sure we monkey_patch right at the start, before other imports
# see https://github.com/miguelgrinberg/Flask-SocketIO/issues/806
# and https://github.com/eventlet/eventlet/issues/896

import os
from urllib.parse import urlparse, urlunparse

import sqlalchemy
import pytest
import yaml
from munch import munchify

from server.db.db import db_migrations
from server.tools import read_file
from server.scim.schema_template import init_scim_schemas

_configured_workers: set[str] = set()


def _worker_database_uris(base_uri: str, worker_id: str) -> tuple[str, str]:
    """Build admin and per-worker URIs for sbs_test (local) or sbs (docker/CI)."""
    parsed = urlparse(base_uri)
    db_name = parsed.path.lstrip("/")
    if db_name not in ("sbs", "sbs_test"):
        raise ValueError(f"Unexpected database URI for pytest workers: {base_uri}")
    root_uri = urlunparse(parsed._replace(path="/"))
    worker_uri = urlunparse(parsed._replace(path=f"/sbs_{worker_id}"))
    return root_uri, worker_uri


def _configure_worker_database(worker_id: str) -> None:
    if worker_id == "master" or worker_id in _configured_workers:
        return

    config_file = os.environ.get("CONFIG", "config/test_config.yml")
    config = munchify(yaml.load(read_file(config_file), Loader=yaml.FullLoader))
    database_uri_root, database_uri = _worker_database_uris(config.database.uri, worker_id)

    engine = sqlalchemy.create_engine(database_uri_root)
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text(f"CREATE DATABASE IF NOT EXISTS sbs_{worker_id}"))

    os.environ["CONFIG"] = os.environ.get("CONFIG", "config/test_config.yml")
    os.environ["SBS_DB_URI_OVERRIDE"] = database_uri
    db_migrations(database_uri)

    if hasattr(config, "scim_schema_sram"):
        init_scim_schemas(config.scim_schema_sram)

    _configured_workers.add(worker_id)


def pytest_sessionstart():
    import eventlet

    eventlet.monkey_patch(thread=False)


def pytest_configure(config):
    # Set per-worker DB before server.__main__ is imported (e.g. AbstractTest.setUpClass).
    worker_id = os.environ.get("PYTEST_XDIST_WORKER")
    if worker_id:
        _configure_worker_database(worker_id)


@pytest.fixture(autouse=True, scope="session")
def use_random_db(worker_id):
    _configure_worker_database(worker_id)
