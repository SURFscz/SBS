import datetime

import sqlalchemy


# make sure all database columns can be used as timezone aware datetime
# adapted from https://docs.sqlalchemy.org/en/20/core/custom_types.html#store-timezone-aware-timestamps-as-timezone-naive-utc
class TZDateTime(sqlalchemy.TypeDecorator):
    impl = sqlalchemy.DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        elif isinstance(value, datetime.datetime):
            if value.tzinfo is None:
                raise Exception(f"Datetime '{value}' must be timezone aware")
            else:
                return value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        # note: datetime.date is also an instance of datetime.datetime, so ordering matters here
        elif isinstance(value, datetime.date):
            # convert to datetime, setting time to 0
            return datetime.datetime(value.year, value.month, value.day, tzinfo=datetime.timezone.utc)
        else:
            raise Exception(f"Unknown type '{type(value)}' for datetime")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        elif value.tzinfo is None:
            # database returned non-timezoned datetime, so assume UTC
            return value.replace(tzinfo=datetime.timezone.utc)
        else:
            # database returned timezone aware datetime, so convert to UTC
            return value.astimezone(datetime.timezone.utc)
