# -*- coding: future_fstrings -*-
from datetime import datetime, date, time, timedelta

full_text_search_autocomplete_limit = 16


def default_expiry_date(json_dict=None):
    if json_dict is not None and "expiry_date" in json_dict:
        ms = int(json_dict["expiry_date"])
        return datetime.utcfromtimestamp(ms)
    return datetime.combine(date.today(), time()) + timedelta(days=15)
