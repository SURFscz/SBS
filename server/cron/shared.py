# -*- coding: future_fstrings -*-

from sqlalchemy import text

from server.db.db import db


def obtain_lock(app, lock_name, success, failure, wait_time=3):
    with app.app_context():
        session = db.create_session(options={})()
        try:
            result = session.execute(text(f"SELECT GET_LOCK('{lock_name}', {wait_time})"))
            lock_obtained = next(result, (0,))[0]
            return success(app) if lock_obtained else failure()
        finally:
            session.execute(text(f"SELECT RELEASE_LOCK('{lock_name}')"))
