# -*- coding: future_fstrings -*-
import datetime

full_text_search_autocomplete_limit = 16


def default_expiry_date(json_dict=None):
    if json_dict is not None and "expiry_date" in json_dict:
        ms = int(json_dict["expiry_date"])
        return datetime.datetime.utcfromtimestamp(ms)
    return datetime.datetime.today() + datetime.timedelta(days=15)
