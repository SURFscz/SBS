import time
from datetime import datetime
from typing import Annotated

from pydantic import PlainSerializer


def _epoch_seconds(value: datetime) -> int:
    return int(time.mktime(value.timetuple()))


# All dates are sent as epoch seconds, like DynamicExtendedJSONProvider does for the ORM models.
# Serializing here instead of in the json provider keeps the generated TypeScript types honest.
EpochSeconds = Annotated[datetime, PlainSerializer(_epoch_seconds, return_type=int)]
