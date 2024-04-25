import time
from datetime import date

from flask.json.provider import DefaultJSONProvider

from server.db.domain import Tag


class DynamicExtendedJSONProvider(DefaultJSONProvider):

    def default(self, o):
        if isinstance(o, Tag):
            # Prevent ValueError: Circular reference detected cause of tags
            return {"id": getattr(o, "id"), "tag_value": getattr(o, "tag_value")}
        if hasattr(o, "__json__"):
            return o.__json__()
        if isinstance(o, date):
            return int(time.mktime(o.timetuple()))
        return super(DynamicExtendedJSONProvider, self).default(o)
