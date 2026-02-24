import logging

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("scheduler")


def cleanup_stale_locks(session, timeout_minutes=60):
    """Clean up locks that are older than timeout_minutes."""
    try:
        session.execute(
            text("DELETE FROM distributed_locks WHERE acquired_at < NOW() - INTERVAL :timeout MINUTE"),
            {"timeout": timeout_minutes}
        )
        session.commit()
    except Exception as e:
        logger.warning(f"Failed to cleanup stale locks: {e}")
        session.rollback()


def obtain_lock(app, lock_name, success, failure):
    with app.app_context():
        session = sessionmaker(app.db.engine)()
        try:
            # Try to insert a new lock record
            try:
                session.execute(
                    text("INSERT INTO distributed_locks (lock_name, acquired_at) VALUES (:lock_name, NOW())"),
                    {"lock_name": lock_name}
                )
                session.commit()
                lock_obtained = True
            except IntegrityError:
                # Lock already exists (another instance holds it)
                session.rollback()
                lock_obtained = False
                # Cleanup stale locks that might not have been released due to crashes
                cleanup_stale_locks(session)
            
            if lock_obtained:
                try:
                    return success(app)
                finally:
                    # Release the lock
                    try:
                        session.execute(
                            text("DELETE FROM distributed_locks WHERE lock_name = :lock_name"),
                            {"lock_name": lock_name}
                        )
                        session.commit()
                    except Exception as e:
                        logger.warning(f"Failed to release lock {lock_name}: {e}")
            else:
                return failure()
        finally:
            session.close()
