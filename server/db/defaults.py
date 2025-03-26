import random
import re
import string
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone
from typing import Optional

from werkzeug.exceptions import BadRequest

from server.tools import dt_now

full_text_search_autocomplete_limit = 16

STATUS_ACTIVE = "active"
STATUS_EXPIRED = "expired"
STATUS_ACCEPTED = "accepted"
STATUS_SUSPENDED = "suspended"

STATUS_OPEN = "open"
STATUS_DENIED = "denied"
STATUS_APPROVED = "approved"

SERVICE_TOKEN_INTROSPECTION = "introspection"
SERVICE_TOKEN_PAM = "pam"
SERVICE_TOKEN_SCIM = "scim"

service_token_options = {"token_enabled": SERVICE_TOKEN_INTROSPECTION,
                         "pam_web_sso_enabled": SERVICE_TOKEN_PAM,
                         "scim_client_enabled": SERVICE_TOKEN_SCIM}

SBS_LOGIN = "sbs_login"
PROXY_AUTHZ = "proxy_authz"
PROXY_AUTHZ_SBS = "proxy_authz_sbs"
PROXY_AUTHZ_EB = "proxy_authz_eb"
PAM_WEB_LOGIN = "pam_web_login"
USER_TOKEN_INTROSPECT = "user_token_introspect"


def default_expiry_date(json_dict=None):
    if json_dict is not None and "expiry_date" in json_dict:
        ms = int(json_dict["expiry_date"])
        dt = datetime.fromtimestamp(ms, timezone.utc)
        return datetime(year=dt.year, month=dt.month, day=dt.day, hour=0, minute=0, second=0, tzinfo=timezone.utc)
    return dt_now() + timedelta(days=15)


def calculate_expiry_period(invitation, today=dt_now()):
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


def generate_short_name(cls, name, attr="short_name"):
    data = {"short_name": name}
    cleanse_short_name(data)
    short_name = data["short_name"]
    if len(short_name) == 0:
        short_name = "short_name"
    counter = 2
    generated_short_name = short_name
    while True and counter < 999:
        filters = {attr: generated_short_name}
        unique_short_name = cls.query.filter_by(**filters).count() == 0
        if unique_short_name:
            return generated_short_name
        generated_short_name = f"{short_name[:16 - len(str(counter))]}{counter}"
        counter = counter + 1
    # Very unlikely Fallback
    return "".join(random.sample(string.ascii_lowercase, k=16))


def cleanse_short_name(data, attr="short_name"):
    """
    Cleanses a short_name attribute in a JSON object (typically a description of a CO).
    :param data: The JSON object (CO)
    :param attr: The attribute name
    :return: True if the attribute was modified, False otherwise
    """
    if attr not in data:
        raise BadRequest(f"Missing {attr} in JSON")
    short_name = data[attr]
    while short_name and short_name[0].isnumeric():
        short_name = short_name[1:]

    short_name = re.sub(r"[^a-zA-Z_0-9]+", "", short_name).lower()[:16]

    is_modified = not (data[attr] == short_name)
    data[attr] = short_name

    return not is_modified


uri_re = re.compile("^(https?|ssh|ftp)://(.+)$", re.IGNORECASE)


def valid_uri_attributes(data, uri_attributes):
    for uri_attr in uri_attributes:
        uri = data.get(uri_attr)
        if uri:
            data[uri_attr] = uri.strip()
            uri = data[uri_attr]
            if uri_attr == "uri":
                uri = uri.replace("{co_short_name}", "").replace("{username}", "")
        if uri and not bool(uri_re.match(uri)):
            raise BadRequest(f"'{uri}' is not a valid uri")
    return True


def valid_tag_label(tag_value: Optional[str]) -> bool:
    return bool(tag_value) and bool(tag_value.strip()) and len(tag_value) < 33


def split_user_affiliations(user):
    affiliations = (user.affiliation.split(",") if user.affiliation else []) + (
        user.scoped_affiliation.split(",") if user.scoped_affiliation else [])
    arr = [affiliation.strip() for affiliation in affiliations]
    return f"{', '.join(arr[:-1])} and {arr[-1]}" if len(arr) > 1 else ",".join(arr)
