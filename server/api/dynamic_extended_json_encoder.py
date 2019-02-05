import time
from datetime import date

from flask.json import JSONEncoder


class DynamicExtendedJSONEncoder(JSONEncoder):
    def default(self, o):
        if hasattr(o, "__json__"):
            return o.__json__()
        if isinstance(o, date):
            return time.mktime(o.timetuple())
        return super(DynamicExtendedJSONEncoder, self).default(o)
