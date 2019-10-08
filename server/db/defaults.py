# -*- coding: future_fstrings -*-
from datetime import datetime, date, time, timedelta
from collections.abc import Iterable
full_text_search_autocomplete_limit = 16


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
