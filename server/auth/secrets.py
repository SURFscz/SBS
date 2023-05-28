import hashlib
import string
from secrets import token_urlsafe, SystemRandom

import bcrypt
from werkzeug.exceptions import SecurityError

SYSTEM_RANDOM = SystemRandom()

MIN_SECRET_LENGTH = 43


def secure_hash(secret):
    return f"sha3_512_{hashlib.sha3_512(bytes(secret, 'utf-8')).hexdigest()}"


def generate_token():
    return f"A{token_urlsafe()}"


def hash_secret_key(data, attr_name="hashed_secret"):
    secret = data[attr_name]
    if len(secret) < MIN_SECRET_LENGTH:
        raise SecurityError(f"minimal length of secret for API key is {MIN_SECRET_LENGTH}")
    data[attr_name] = secure_hash(secret)
    return data


def generate_ldap_password_with_hash():
    password = "".join(SYSTEM_RANDOM.sample(population=string.ascii_lowercase + string.digits + "_,./~=+@*-", k=32))
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8"), password
