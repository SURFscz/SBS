import time
from datetime import date

from flask.json.provider import DefaultJSONProvider


class DynamicExtendedJSONProvider(DefaultJSONProvider):

    def default(self, o):
        if hasattr(o, "__json__"):
            return o.__json__()
        if isinstance(o, date):
            return int(time.mktime(o.timetuple()))
        return super(DynamicExtendedJSONProvider, self).default(o)
