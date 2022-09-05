# -*- coding: future_fstrings -*-
import re
from collections.abc import Iterable
from datetime import datetime, date, time, timedelta

from werkzeug.exceptions import BadRequest

full_text_search_autocomplete_limit = 16

STATUS_ACTIVE = "active"
STATUS_EXPIRED = "expired"
STATUS_SUSPENDED = "suspended"


def default_expiry_date(json_dict=None):
    if json_dict is not None and "expiry_date" in json_dict:
        ms = int(json_dict["expiry_date"])
        dt = datetime.utcfromtimestamp(ms)
        return datetime(year=dt.year, month=dt.month, day=dt.day, hour=0, minute=0, second=0)
    return datetime.combine(date.today(), time()) + timedelta(days=15)


def calculate_expiry_period(invitation, today=datetime.today()):
    if (isinstance(invitation, Iterable) and "expiry_date" not in invitation) or not invitation.expiry_date:
        return "15 days"
    diff = invitation.expiry_date - today
    if diff.days < 1:
        hours = int(diff.seconds / 60 / 60)
        if hours < 1:
            return f"{int(diff.seconds / 60)} minutes"
        if hours == 1:
            return "1 hour"
        return f"{hours} hours"
    if diff.days == 1:
        return "1 day"
    return f"{diff.days} days"


def cleanse_short_name(data, attr="short_name"):
    if attr not in data:
        raise BadRequest(f"Missing {attr} in JSON")
    short_name = data[attr]
    while short_name[0].isnumeric():
        short_name = short_name[1:]

    data[attr] = re.sub(r"[^a-zA-Z_0-9]+", "", short_name).lower()[:16]


uri_re = re.compile("^https?://(?:www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}"
                    "\\.[a-zA-Z0-9()]{1,6}\\b[-a-zA-Z0-9()@:%_+.~#?&/=]*$")


def valid_uri_attributes(data, uri_attributes):
    for uri_attr in uri_attributes:
        uri = data.get(uri_attr)
        uri = uri.lower().replace("{co_short_name}", "").replace("{username}", "") if uri and uri_attr == "uri" else uri
        if uri and not bool(uri_re.match(uri)):
            raise ValueError(f"{uri} is not a valid uri")
    return True
