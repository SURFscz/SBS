from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from server.logger.context_logger import ctx_logger


def obtain_lock(app, lock_name, success, failure):
    ctx_logger("wonky").debug(f"Obtaining lock {lock_name}")
    with app.app_context():
        with sessionmaker(app.db.engine).begin() as session:
            try:
                # Important that we don't wait as this causes jobs to run twice
                result = session.execute(text(f"SELECT GET_LOCK('{lock_name}', 0)"))
                lock_obtained = next(result, (0,))[0]
                ctx_logger("wonky").debug(f"Got lock {lock_name}: '{lock_obtained}'")
                return success(app) if lock_obtained else failure()
            finally:
                ctx_logger("wonky").debug(f"Release {lock_name}")
                session.execute(text(f"SELECT RELEASE_LOCK('{lock_name}')"))
