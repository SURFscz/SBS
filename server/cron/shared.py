import socket
from datetime import timedelta

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from db.domain import DistributedLock
from server.tools import dt_now

INSTANCE_ID = socket.gethostname()


def obtain_lock(app, lock_name, success, failure):
    with app.app_context():
        with sessionmaker(app.db.engine).begin() as session:
            now = dt_now()
            lock_until = now + timedelta(seconds=60 * 15)
            session.execute(text("""
                                 INSERT INTO distributed_locks (lock_name, acquired_at, lock_until, fencing_token, locked_by)
                                 VALUES (:name, :now, :now, 0, '')
                                 ON DUPLICATE KEY UPDATE lock_name = lock_name
                                 """), {"name": lock_name, "now": now})

            result = session.execute(text("""
                                          UPDATE distributed_locks
                                          SET acquired_at   = :now,
                                              lock_until    = :lock_until,
                                              fencing_token = fencing_token + 1,
                                              locked_by     = :instance
                                          WHERE lock_name = :name
                                            AND lock_until <= :now
                                          """), {
                                         "name": lock_name,
                                         "now": now,
                                         "lock_until": lock_until,
                                         "instance": INSTANCE_ID
                                     })
            if result.rowcount != 1:
                return failure()

            row = DistributedLock.query.filter_by(lock_name=lock_name).first()

            if not row:
                return failure()

            # Only trust if we are still the owner
            if row.locked_by != INSTANCE_ID:
                return failure()
            # TODO - add return row.fencing_token to the success
            return success(app)


def is_still_lock_owner(lock_name: str, token: int) -> bool:
    row = DistributedLock.query.filter_by(lock_name=lock_name).first()
    return row and row.fencing_token == token
