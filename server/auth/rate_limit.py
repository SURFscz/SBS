import json
from datetime import datetime, timedelta
from flask import current_app

from server.db.domain import User


def rate_limit_reached(user: User):
    redis = current_app.redis_client
    key = str(user.id)
    value = redis.get(key)
    rate_limit_info = json.loads(value) if value else {"date": datetime.now().isoformat(), "count": 0}
    first_guess = datetime.fromisoformat(rate_limit_info["date"])
    seconds_ago = datetime.now() - timedelta(hours=0, minutes=0, seconds=30)
    count = rate_limit_info["count"]
    rate_limit = current_app.app_config.rate_limit_totp_guesses_per_30_seconds
    # Need to reset the first_guess if it is more then 30 seconds ago, otherwise the user can circumvent this
    # TODO
    max_reached = count >= rate_limit and first_guess <= seconds_ago
    if not max_reached:
        redis.set(key, json.dumps({"date": first_guess.isoformat(), "count": count + 1}))
    return max_reached


def clear_rate_limit(user: User):
    current_app.redis_client.delete(str(user.id))
