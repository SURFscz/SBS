from sqlalchemy import text

from server.db.db import db
from server.db.domain import Service


def atomic_increment_counter_value(service: Service):
    session = db.create_session(options={})()
    session.begin()
    rows = session.execute(text(f"select counter from scim_service_counters"
                                f" where service_id = {service.id} for update"))
    if rows.rowcount == 0:
        session.execute(text(f"insert into scim_service_counters (service_id, counter) values ({service.id}, 1) "))
        session.commit()
        return 1
    else:
        counter = next(rows, (0,))[0]
        session.execute(text(f"update scim_service_counters set counter = counter + 1 where service_id = {service.id}"))
        session.commit()
        return counter + 1
