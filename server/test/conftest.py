# make sure we monkey_patch right at the start, before other imports
# see https://github.com/miguelgrinberg/Flask-SocketIO/issues/806
# and https://github.com/eventlet/eventlet/issues/896

import logging
import os

import pytest

from server.db.db import db_migrations

def pytest_sessionstart(session):
    print("Starting pytest session...")

    import eventlet
    eventlet.monkey_patch(thread=False)

    #from gevent import monkey
    #monkey.patch_all()

@pytest.fixture(autouse=True, scope='session')
def use_random_db(request, worker_id):
    logging.error(f"random_db fixture called: {worker_id}")
    with open(f'/tmp/pytest_{worker_id}', 'a') as f:
        f.write(worker_id)

    os.environ['SBS_DB_NAME_OVERRIDE'] = f"mysql+mysqldb://sbs:sbs@127.0.0.1/sbs_{worker_id}?charset=utf8mb4"
    db_migrations(os.environ['SBS_DB_NAME_OVERRIDE'])

