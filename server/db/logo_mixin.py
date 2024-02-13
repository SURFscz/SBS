import re

from flask import current_app
from sqlalchemy import text, bindparam, String
from werkzeug.exceptions import NotFound, BadRequest

uuid4_reg_exp = re.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$")

login_mixins_classes = ["collaborations", "collaboration_requests", "organisations", "services", "service_requests"]


def _redis_key(object_type, sid):
    return f"{object_type}_{sid}"


def logo_from_cache(object_type, sid):
    value = current_app.redis_client.get(_redis_key(object_type, sid))
    if not value:
        if object_type not in login_mixins_classes:
            raise BadRequest(f"Not allowed object type {object_type}")
        if not bool(uuid4_reg_exp.match(sid)):
            raise BadRequest(f"Not allowed sid {sid}")

        # This will not happen often, but if external parties use the image url it is theoretically possible
        sql = text(f"SELECT logo FROM {object_type} where uuid4 = :sid")
        sql = sql.bindparams(bindparam("sid", type_=String))

        from server.db.db import db
        with db.engine.connect() as conn:
            result_set = conn.execute(sql, dict(sid=sid))
        try:
            value = next(result_set)[0]
        except StopIteration:
            raise NotFound()
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
        elif name == "ldap_password" or name == "hashed_token":
            return None
        return object.__getattribute__(self, name)

    def raw_logo(self):
        return object.__getattribute__(self, "logo")
