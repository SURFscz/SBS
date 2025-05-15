import time
from datetime import date

from flask.json.provider import DefaultJSONProvider

from server.db.domain import Tag, User


class DynamicExtendedJSONProvider(DefaultJSONProvider):

    def default(self, o):
        if isinstance(o, Tag):
            # Prevent ValueError: Circular reference detected cause of tags
            return {
                "id": getattr(o, "id"), "tag_value": getattr(o, "tag_value"), "is_default": getattr(o, "is_default"),
                "organisation_id": getattr(o, "organisation_id"),
                "units": [{"id": getattr(u, "id"), "name": getattr(u, "name")} for u in getattr(o, "units", [])]
            }
        if isinstance(o, User):
            res = o.__json__()
            return User.translate_user_mfa_attributes(res)
        if hasattr(o, "__json__"):
            return o.__json__()
        if isinstance(o, date):
            return int(time.mktime(o.timetuple()))
        if isinstance(o, set):
            return [*o]
        return super(DynamicExtendedJSONProvider, self).default(o)
