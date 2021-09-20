from flask import current_app
from sqlalchemy import text, bindparam, String


def _redis_key(object_type, sid):
    return f"{object_type}_{sid}"


def logo_from_cache(object_type, sid):
    value = current_app.redis_client.get(_redis_key(object_type, sid))
    if not value:
        # This will not happen often, but if external parties use the image url it is theoretically possible
        sql = text(f"SELECT logo FROM {object_type} where uuid4 = :sid")
        sql = sql.bindparams(bindparam("sid", type_=String))

        from server.db.db import db

        result_set = db.engine.execute(sql, sid=(sid))
        value = next(result_set)[0]
        current_app.redis_client.set(_redis_key(object_type, sid), value)
        return value.encode()
    return value


def evict_from_cache(object_type, sid):
    current_app.redis_client.delete(_redis_key(object_type, sid))


def logo_url(object_type, sid):
    return f"{current_app.app_config.base_server_url}/api/images/{object_type}/{sid}"


class LogoMixin(object):

    def __getattribute__(self, name):
        if name == "logo":
            logo = object.__getattribute__(self, name)
            if not logo:
                return logo

            object_type = str(self._sa_class_manager.mapper.persist_selectable.name)
            sid = self.uuid4
            redis_key = _redis_key(object_type, sid)
            if not current_app.redis_client.exists(redis_key):
                current_app.redis_client.set(redis_key, logo)
            return logo_url(object_type, sid)

        return object.__getattribute__(self, name)
