import json
from datetime import datetime, timedelta, timezone

from flask import current_app, session
from werkzeug.exceptions import TooManyRequests

from server.db.db import db
from server.db.domain import User
from server.mail import mail_error
from server.tools import dt_now


def check_rate_limit(user: User):
    if user.rate_limited:
        raise TooManyRequests(f"{user.name} was TOTP rate limited. Not allowed to verify 2FA.")

    if rate_limit_reached(user):
        user.mfa_reset_token = None
        user.second_factor_auth = None
        user.rate_limited = True
        # Prevent MFA SSO
        user.last_login_date = None
        db.session.merge(user)
        db.session.commit()
        session.clear()
        mail_conf = current_app.app_config.mail
        tb = (f"TOTP rate limit reached, user TOTP has been reset: name={user.name}, uid={user.uid},"
              f" email={user.email}.")
        mail_error(mail_conf.environment, user.id, mail_conf.send_exceptions_recipients, tb)
        raise TooManyRequests(f"Reset TOTP user {user.name}, uid={user.uid}, email={user.email} for rate limiting TOTP")


def rate_limit_reached(user: User):
    redis = current_app.redis_client
    key = str(user.id)
    value = redis.get(key)
    rate_limit_info = json.loads(value) if value else {"date": dt_now().isoformat(), "count": 0}
    first_guess = datetime.fromisoformat(rate_limit_info["date"])
    first_guess.replace(tzinfo=timezone.utc)
    seconds_ago = dt_now() - timedelta(hours=0, minutes=0, seconds=30)
    count = rate_limit_info["count"]
    rate_limit = current_app.app_config.rate_limit_totp_guesses_per_30_seconds
    max_reached = count >= rate_limit and first_guess >= seconds_ago
    if not max_reached:
        # Need to reset the first_guess if it is more then 30 seconds ago, otherwise the user can still brute force
        in_30_seconds_window = first_guess > seconds_ago
        new_date = first_guess.isoformat() if in_30_seconds_window else dt_now().isoformat()
        new_count = count + 1 if in_30_seconds_window else 0
        redis.set(key, json.dumps({"date": new_date, "count": new_count}))
    return max_reached


def clear_rate_limit(user: User):
    current_app.redis_client.delete(str(user.id))
