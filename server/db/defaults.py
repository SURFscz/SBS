import datetime


def default_expiry_date(json_dict=None):
    if json_dict is not None and "expiry_date" in json_dict:
        ms = int(json_dict["expiry_date"])
        return datetime.datetime.utcfromtimestamp(ms)
    return datetime.date.today() + datetime.timedelta(days=14)
