import datetime

from db import db


# make sure all database columns can be used as timezone aware datetime
# adapted from https://docs.sqlalchemy.org/en/20/core/custom_types.html#store-timezone-aware-timestamps-as-timezone-naive-utc
class TZDateTime(db.TypeDecorator):
    impl = db.DateTime
    cache_ok = True

    @staticmethod
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        elif isinstance(value, datetime.date):
            # convert to datetime, setting time to 0
            return datetime.datetime(value.year, value.month, value.day, tzinfo=datetime.timezone.utc)
        elif isinstance(value, datetime.datetime):
            if value.tzinfo is None:
                raise Exception(f"Datetime '{value}' must be timezone aware")
            else:
                return value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        else:
            raise Exception(f"Unknown type '{type(value)}' for datetime")

    @staticmethod
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        elif value.tzinfo is None:
            # database returned non-timezoned datetime, so assume UTC
            return value.replace(tzinfo=datetime.timezone.utc)
        else:
            # database returned timezone aware datetime, so convert to UTC
            return value.astimezone(datetime.timezone.utc)
