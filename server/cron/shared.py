from sqlalchemy import text
from sqlalchemy.orm import sessionmaker


def obtain_lock(app, lock_name, success, failure):
    with app.app_context():
        with sessionmaker(app.db.engine).begin() as session:
            try:
                # Important that we don't wait as this causes jobs to run twice
                result = session.execute(text(f"SELECT GET_LOCK('{lock_name}', 0)"))
                lock_obtained = next(result, (0,))[0]
                return success(app) if lock_obtained else failure()
            finally:
                session.execute(text(f"SELECT RELEASE_LOCK('{lock_name}')"))
