import time
from datetime import date

from flask.json import JSONEncoder

from server.db.db import CollaborationMembership


class DynamicExtendedJSONEncoder(JSONEncoder):
    def default(self, o):
        if hasattr(o, "__json__"):
            if isinstance(o, CollaborationMembership):
                return o.__json__(exluded_keys={"collaboration", })
            return o.__json__()
        if isinstance(o, date):
            return time.mktime(o.timetuple())
        return super(DynamicExtendedJSONEncoder, self).default(o)
